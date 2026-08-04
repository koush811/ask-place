/**
 * 校内マップ 経路探索モジュール
 * nodes/edges を渡すとダイクストラ法で最短経路を返す。
 *
 * campus_map_data.json の形式:
 *   { nodes: [...], edges: [...], zones: [...], floorOrder: [...], floorLabels: {...} }
 *
 * edges が用意されていれば、それをそのまま使う(実測に基づく最も正確な接続関係)。
 * edges が空/未指定の場合のみ autoGenerateEdges() で座標から接続関係を自動推定する:
 *  - 各フロアの branch / stairs / entrance を「廊下の骨格」とみなし、
 *    近傍数点(KNN)+ 最小全域木(MST)で互いに接続する(同フロア内のみ)
 *  - room / stamp は同じフロアの最も近い骨格ノードに接続する
 *  - 階段(stairs)の階をまたぐ接続は座標の近さでは"推測しない"。
 *    stairs ノードの `name`(A, B, C…のような階段の識別名)が完全一致するもの
 *    同士だけを、フロア順に隣接させて接続する。
 *
 * zones(通行不可エリア):
 *   { id, floor, points: [{x,y}, ...], label } のポリゴンで指定されたエリア内に
 *   座標が含まれるノードは、経路探索のグラフから除外される(=通行不可)。
 */

const CROSS_FLOOR_WEIGHT = 80 // 階段/EV移動のコスト(調整可能)
const DEFAULT_FLOOR_ORDER = ['floor_1F', 'floor_2F', 'floor_3F', 'floor_4F', 'floor_5F']
const HUB_TYPES = ['branch', 'stairs', 'entrance']
const LEAF_TYPES = ['room']

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * 点(x,y)がポリゴン(zone.points)の内側にあるかを判定する(レイキャスト法)。
 * @param {{x:number,y:number}} point
 * @param {Array<{x:number,y:number}>} polygon
 * @returns {boolean}
 */
function isPointInPolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/**
 * ノードが、いずれかの zone(同じフロア)の内側にあるかを判定する。
 * @param {Object} node
 * @param {Array} zones
 * @returns {boolean}
 */
function isNodeInAnyZone(node, zones) {
  if (!zones || zones.length === 0) return false
  return zones.some(
    (zone) =>
      zone.floor === node.floor &&
      Array.isArray(zone.points) &&
      zone.points.length >= 3 &&
      isPointInPolygon(node, zone.points),
  )
}

/** 線分(p1-p2)と線分(p3-p4)が交差するかを判定する */
function segmentsIntersect(p1, p2, p3, p4) {
  const d = (a, b, c) => (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)
  const d1 = d(p3, p4, p1)
  const d2 = d(p3, p4, p2)
  const d3 = d(p1, p2, p3)
  const d4 = d(p1, p2, p4)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  return false
}

/**
 * 線分(a-b)がポリゴンの辺のいずれかと交差する、またはポリゴンの内部を通るかを判定する。
 * ノード自体がzone外でも、その2点を結ぶ直線がzoneを突っ切るケースを検出するために使う。
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 * @param {Array<{x:number,y:number}>} polygon
 * @returns {boolean}
 */
function segmentIntersectsPolygon(a, b, polygon) {
  // 辺との交差判定
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    if (segmentsIntersect(a, b, polygon[i], polygon[j])) return true
  }
  // 線分の中点がポリゴン内部にある場合(短い線分が丸ごとzone内に収まっているケース)も通行不可とする
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  if (isPointInPolygon(mid, polygon)) return true
  return false
}

/**
 * 線分(a-b)が、同じフロアのいずれかのzoneを横切るかを判定する。
 * @param {Object} a ノード
 * @param {Object} b ノード
 * @param {Array} zones
 * @returns {boolean}
 */
function segmentCrossesAnyZone(a, b, zones) {
  if (!zones || zones.length === 0) return false
  if (a.floor !== b.floor) return false // 階をまたぐ接続(階段)はフロア内ポリゴンと比較しない
  return zones.some(
    (zone) =>
      zone.floor === a.floor &&
      Array.isArray(zone.points) &&
      zone.points.length >= 3 &&
      segmentIntersectsPolygon(a, b, zone.points),
  )
}

/** 与えられたノード集合を最小全域木(MST)で接続するedgeを返す */
function mstEdges(nodes) {
  if (nodes.length < 2) return []
  const inTree = new Set([nodes[0].id])
  const edges = []
  while (inTree.size < nodes.length) {
    let best = null
    nodes.forEach((a) => {
      if (!inTree.has(a.id)) return
      nodes.forEach((b) => {
        if (inTree.has(b.id)) return
        const d = dist(a, b)
        if (!best || d < best.d) best = { from: a.id, to: b.id, d }
      })
    })
    if (!best) break
    edges.push({ from: best.from, to: best.to })
    inTree.add(best.to)
  }
  return edges
}

/**
 * 各ノードを最も近いk個のノードに接続するedgeを返す(近傍グラフ)。
 * MSTは「木」なので2点間の経路が1本しかなく遠回りになりがちなため、
 * これを併用して実際の廊下に近い複数の経路候補をダイクストラ法に与える。
 */
function knnEdges(nodes, k) {
  const edges = []
  nodes.forEach((a) => {
    const nearest = nodes
      .filter((b) => b.id !== a.id)
      .map((b) => ({ to: b.id, d: dist(a, b) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, k)
    nearest.forEach((n) => edges.push({ from: a.id, to: n.to }))
  })
  return edges
}

/**
 * 同じ name(A, B, C…のような階段の識別名)を持つ stairs ノード同士を、
 * フロア順に隣接するものだけ接続する。座標の近さによる推測は一切行わない
 * (誤接続を避けるため)。name が無い stairs ノードは対象外。
 */
function stairNameEdges(nodes, floorOrder) {
  const edges = []
  const stairs = nodes.filter((n) => n.type === 'stairs' && n.name)

  const groups = new Map()
  stairs.forEach((n) => {
    if (!groups.has(n.name)) groups.set(n.name, [])
    groups.get(n.name).push(n)
  })

  groups.forEach((groupNodes) => {
    const sorted = groupNodes
      .slice()
      .sort((a, b) => floorOrder.indexOf(a.floor) - floorOrder.indexOf(b.floor))

    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i]
      const b = sorted[i + 1]
      const aIdx = floorOrder.indexOf(a.floor)
      const bIdx = floorOrder.indexOf(b.floor)
      // 同じnameでも階が飛んでいる(間の階にその階段が無い)場合は接続しない
      if (bIdx - aIdx !== 1) continue
      edges.push({ from: a.id, to: b.id, crossFloor: true })
    }
  })

  return edges
}

/**
 * ノード配列だけから edges を自動生成する(zones内のノードは除外済みのnodesを渡すこと)。
 * @param {Array} nodes
 * @param {Array} floorOrder
 * @returns {Array} edges
 */
function autoGenerateEdges(nodes, floorOrder = DEFAULT_FLOOR_ORDER) {
  const edges = []
  const floors = [...new Set(nodes.map((n) => n.floor))]

  floors.forEach((floor) => {
    const floorNodes = nodes.filter((n) => n.floor === floor)
    const hubs = floorNodes.filter((n) => HUB_TYPES.includes(n.type))
    const leaves = floorNodes.filter((n) => LEAF_TYPES.includes(n.type))

    // 骨格(分岐点・階段・入口)同士を同フロア内で接続:
    // 近傍数点(KNN)で実際の廊下に近い複数経路を作りつつ、MSTで連結性も保証する
    if (hubs.length >= 2) {
      edges.push(...knnEdges(hubs, Math.min(3, hubs.length - 1)))
      edges.push(...mstEdges(hubs))
    }

    // 各教室は同フロアの最も近い骨格ノードへ接続(骨格が無ければ最も近い他ノードへ)
    leaves.forEach((leaf) => {
      const candidates = hubs.length ? hubs : floorNodes.filter((n) => n.id !== leaf.id)
      let nearest = null
      candidates.forEach((c) => {
        const d = dist(leaf, c)
        if (!nearest || d < nearest.d) nearest = { to: c.id, d }
      })
      if (nearest) edges.push({ from: leaf.id, to: nearest.to })
    })
  })

  // 階をまたぐ接続は座標での推測をやめ、明示的な name 一致のみで行う
  edges.push(...stairNameEdges(nodes, floorOrder))

  return edges
}

/**
 * nodes/edges から隣接リストを作る。blockedなエッジ、zone内のノードは除外。
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Array} zones
 * @returns {Object} { [nodeId]: [{ to, weight }] }
 */
function buildGraph(nodes, edges, zones = []) {
  const adj = {}
  const blockedIds = new Set()

  nodes.forEach((n) => {
    if (isNodeInAnyZone(n, zones)) {
      blockedIds.add(n.id) // 通行不可エリア内のノードはグラフに含めない
      return
    }
    adj[n.id] = []
  })

  edges.forEach((ed) => {
    if (ed.blocked) return
    if (blockedIds.has(ed.from) || blockedIds.has(ed.to)) return // 通行不可エリアに接するエッジも除外

    const a = nodes.find((n) => n.id === ed.from)
    const b = nodes.find((n) => n.id === ed.to)
    if (!a || !b) return
    if (!(a.id in adj) || !(b.id in adj)) return
    if (segmentCrossesAnyZone(a, b, zones)) return // 経路の線がゾーンを突っ切る場合も除外

    const weight = ed.crossFloor ? CROSS_FLOOR_WEIGHT : Math.hypot(a.x - b.x, a.y - b.y)
    adj[a.id].push({ to: b.id, weight })
    adj[b.id].push({ to: a.id, weight })
  })

  return adj
}

/**
 * ダイクストラ法でスタート→ゴールの最短経路を求める。
 * @returns {string[]|null} 経由ノードIDの配列。到達不可ならnull
 */
function computeRoute(nodes, edges, startId, endId, zones = []) {
  const adj = buildGraph(nodes, edges, zones)
  if (!(startId in adj) || !(endId in adj)) return null

  const dist = {}
  const prev = {}
  const visited = new Set()
  Object.keys(adj).forEach((id) => {
    dist[id] = Infinity
  })
  dist[startId] = 0

  const pq = [[0, startId]]
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0])
    const [d, u] = pq.shift()
    if (visited.has(u)) continue
    visited.add(u)
    if (u === endId) break

    ;(adj[u] || []).forEach((edge) => {
      const nd = d + edge.weight
      if (nd < dist[edge.to]) {
        dist[edge.to] = nd
        prev[edge.to] = u
        pq.push([nd, edge.to])
      }
    })
  }

  if (dist[endId] === Infinity) return null

  const path = []
  let cur = endId
  while (cur !== undefined) {
    path.unshift(cur)
    cur = prev[cur]
  }
  return path
}

/**
 * 経路(ノードID配列)を階ごとの座標列に分割する(描画用)。
 * @returns {Array<{floor: string, points: Array}>}
 */
function routeToFloorSegments(nodes, path) {
  const segments = []
  path.forEach((nodeId) => {
    const n = nodes.find((nn) => nn.id === nodeId)
    if (!n) return
    const last = segments[segments.length - 1]
    const point = { x: n.x, y: n.y, nodeId: n.id, name: n.name }
    if (last && last.floor === n.floor) {
      last.points.push(point)
    } else {
      segments.push({ floor: n.floor, points: [point] })
    }
  })
  return segments
}

/**
 * mapData({ nodes, edges, zones, floorOrder }) からスタート/ゴールを指定して経路を得る。
 * edges が空の場合は autoGenerateEdges(nodes) で自動生成する。
 * zones内のノードは通行不可として除外される。
 * @param {{nodes:Array, edges?:Array, zones?:Array, floorOrder?:Array}} mapData
 * @param {string} startId
 * @param {string} endId
 * @returns {{ path: string[]|null, segments: Array, reachable: boolean }}
 */
function findRoute(mapData, startId, endId) {
  const { nodes, edges, zones = [], floorOrder = DEFAULT_FLOOR_ORDER } = mapData
  const resolvedEdges = edges && edges.length > 0 ? edges : autoGenerateEdges(nodes, floorOrder)
  const path = computeRoute(nodes, resolvedEdges, startId, endId, zones)
  if (!path) return { path: null, segments: [], reachable: false }
  return { path, segments: routeToFloorSegments(nodes, path), reachable: true }
}

export {
  buildGraph,
  computeRoute,
  routeToFloorSegments,
  findRoute,
  autoGenerateEdges,
  isPointInPolygon,
  isNodeInAnyZone,
  segmentCrossesAnyZone,
  CROSS_FLOOR_WEIGHT,
}
