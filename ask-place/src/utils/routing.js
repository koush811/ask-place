/**
 * 校内マップ 経路探索モジュール
 * nodes/edges を渡すとダイクストラ法で最短経路を返す。
 *
 * edges を用意できない場合は autoGenerateEdges() で campus_map_data.json の
 * データだけから接続関係を自動推定できる。
 *  - 各フロアの branch / stairs / entrance を「廊下の骨格」とみなし、
 *    近傍数点(KNN)+ 最小全域木(MST)で互いに接続する(同フロア内のみ)
 *  - room / stamp は同じフロアの最も近い骨格ノードに接続する
 *  - 階段(stairs)の階をまたぐ接続は座標の近さでは"推測しない"。
 *    stairs ノードの `name`(A, B, C…のような階段の識別名)が完全一致するもの
 *    同士だけを、フロア順に隣接させて接続する。
 *    間の階に同じ name の階段が無い(=階が飛んでいる)場合は接続しない
 *    (=「この階段はこの階までしか繋がっていない」を安全側で表現できる)。
 *
 * 例:
 *   { "id": "N054", "floor": "floor_4F", "x": 641, "y": 25, "name": "A", "type": "stairs" }
 *   { "id": "N099", "floor": "floor_5F", "x": 643, "y": 24, "name": "A", "type": "stairs" }
 *   ( → どちらも name: "A" で 4F・5F が隣接フロアなので接続される )
 */

const CROSS_FLOOR_WEIGHT = 80 // 階段/EV移動のコスト(調整可能)
const FLOOR_ORDER = ['floor_1F', 'floor_2F', 'floor_3F', 'floor_4F', 'floor_5F']
const HUB_TYPES = ['branch', 'stairs', 'entrance']
const LEAF_TYPES = ['room', 'stamp']

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
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
function stairNameEdges(nodes) {
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
      .sort((a, b) => FLOOR_ORDER.indexOf(a.floor) - FLOOR_ORDER.indexOf(b.floor))

    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i]
      const b = sorted[i + 1]
      const aIdx = FLOOR_ORDER.indexOf(a.floor)
      const bIdx = FLOOR_ORDER.indexOf(b.floor)
      // 同じnameでも階が飛んでいる(間の階にその階段が無い)場合は接続しない
      if (bIdx - aIdx !== 1) continue
      edges.push({ from: a.id, to: b.id, crossFloor: true })
    }
  })

  return edges
}

/**
 * campus_map_data.json のノード配列だけから edges を自動生成する。
 * @param {Array} nodes
 * @returns {Array} edges
 */
function autoGenerateEdges(nodes) {
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
  edges.push(...stairNameEdges(nodes))

  return edges
}

/**
 * nodes/edges から隣接リストを作る。blockedなエッジは除外。
 * @param {Array} nodes
 * @param {Array} edges
 * @returns {Object} { [nodeId]: [{ to, weight }] }
 */
function buildGraph(nodes, edges) {
  const adj = {}
  nodes.forEach((n) => {
    adj[n.id] = []
  })

  edges.forEach((ed) => {
    if (ed.blocked) return

    const a = nodes.find((n) => n.id === ed.from)
    const b = nodes.find((n) => n.id === ed.to)
    if (!a || !b) return

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
function computeRoute(nodes, edges, startId, endId) {
  const adj = buildGraph(nodes, edges)
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
 * nodes/edges からスタート/ゴールを指定して経路を得る。
 * edges を省略した場合は autoGenerateEdges(nodes) で自動生成する。
 * @returns {{ path: string[]|null, segments: Array, reachable: boolean }}
 */
function findRoute(nodes, edges, startId, endId) {
  const resolvedEdges = edges ?? autoGenerateEdges(nodes)
  const path = computeRoute(nodes, resolvedEdges, startId, endId)
  if (!path) return { path: null, segments: [], reachable: false }
  return { path, segments: routeToFloorSegments(nodes, path), reachable: true }
}

export {
  buildGraph,
  computeRoute,
  routeToFloorSegments,
  findRoute,
  autoGenerateEdges,
  CROSS_FLOOR_WEIGHT,
}