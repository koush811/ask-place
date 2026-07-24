/**
 * 校内マップ 経路探索モジュール
 * nodes/edges を渡すとダイクストラ法で最短経路を返す。
 *
 * edges を用意できない場合は autoGenerateEdges() で campus_map_data.json の
 * 座標(x, y)と type だけから接続関係を自動推定できる。
 *  - 各フロアの branch / stairs / entrance を「廊下の骨格」とみなし、
 *    最小全域木(MST)で互いに接続する
 *  - room / stamp は同じフロアの最も近い骨格ノードに接続する
 *  - 階段(stairs)同士は階層順(1F→2F→3F…)に最も近いもの同士を自動接続する
 * ※ 直線距離ベースの近似なので、壁を迂回するような実際の廊下形状までは
 *   再現できません。より正確な経路が必要な場合は手動で edges を用意してください。
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

    // 骨格(分岐点・階段・入口)同士をMSTで接続
    if (hubs.length >= 2) {
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

  // 階段(stairs)を階層順に最も近いもの同士で接続(縦の移動経路)
  for (let i = 0; i < FLOOR_ORDER.length - 1; i += 1) {
    const lower = nodes.filter((n) => n.floor === FLOOR_ORDER[i] && n.type === 'stairs')
    const upper = nodes.filter((n) => n.floor === FLOOR_ORDER[i + 1] && n.type === 'stairs')
    lower.forEach((a) => {
      let nearest = null
      upper.forEach((b) => {
        const d = dist(a, b)
        if (!nearest || d < nearest.d) nearest = { to: b.id, d }
      })
      if (nearest) edges.push({ from: a.id, to: nearest.to, crossFloor: true })
    })
  }

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
