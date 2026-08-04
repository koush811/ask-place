import { useMemo, useState } from 'react'
import { findRoute } from '../utils/routing.js'
import { useActivityData, buildRoomActivityMap } from '../utils/activities.js'

export default function RouteFinder({ mapData, onRouteComputed, onClear }) {
  const { nodes, floorLabels } = mapData
  const activities = useActivityData()
  const roomActivityMap = useMemo(() => buildRoomActivityMap(activities), [activities])

  const [startQuery, setStartQuery] = useState('')
  const [startId, setStartId] = useState('')
  const [endQuery, setEndQuery] = useState('')
  const [endId, setEndId] = useState('')
  const [error, setError] = useState('')

  const options = useMemo(
    () =>
      nodes
        .filter(
          (p) => p.type === 'entrance' || (p.type === 'room' && roomActivityMap.has(p.name)),
        )
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    [nodes, roomActivityMap],
  )

  const startResults = useMemo(() => {
    const q = startQuery.trim()
    if (!q || startId) return []
    return options.filter((p) => p.name.includes(q))
  }, [startQuery, startId, options])

  const endResults = useMemo(() => {
    const q = endQuery.trim()
    if (!q || endId) return []
    return options.filter((p) => p.name.includes(q))
  }, [endQuery, endId, options])

  const showStartEmpty = startQuery.trim().length > 0 && !startId && startResults.length === 0
  const showEndEmpty = endQuery.trim().length > 0 && !endId && endResults.length === 0

  const handleStartChange = (value) => {
    setStartQuery(value)
    setStartId('')
  }

  const handleEndChange = (value) => {
    setEndQuery(value)
    setEndId('')
  }

  const pickStart = (p) => {
    setStartQuery(p.name)
    setStartId(p.id)
  }

  const pickEnd = (p) => {
    setEndQuery(p.name)
    setEndId(p.id)
  }

  const handleSearch = () => {
    setError('')
    if (!startId || !endId) {
      setError('出発地と目的地を選択してください')
      return
    }
    if (startId === endId) {
      setError('出発地と目的地が同じです')
      return
    }
    const result = findRoute(mapData, startId, endId)
    if (!result.reachable) {
      setError('経路が見つかりません(通行不可エリアを経由する必要がある場合も含む)')
      onClear()
      return
    }
    onRouteComputed(result.segments)
  }

  const handleClear = () => {
    setStartQuery('')
    setStartId('')
    setEndQuery('')
    setEndId('')
    setError('')
    onClear()
  }

  return (
    <div className="route-block">
      <div className="search-label">道案内</div>

      <div className="route-input-group">
        <div className="route-input-label">出発地</div>
        <div className="search-input-wrap">
          <input
            className="search-input"
            type="text"
            inputMode="search"
            placeholder="例：入口"
            value={startQuery}
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </div>
        {startResults.length > 0 && (
          <div className="search-results">
            {startResults.map((p) => (
              <button
                key={p.id}
                type="button"
                className="search-result-item"
                onClick={() => pickStart(p)}
              >
                <span>{p.name}</span>
                <span className="floor-tag">{floorLabels[p.floor]}</span>
              </button>
            ))}
          </div>
        )}
        {showStartEmpty && <div className="search-empty">該当する地点が見つかりません</div>}
      </div>

      <div className="route-arrow-row">↓</div>

      <div className="route-input-group">
        <div className="route-input-label">目的地</div>
        <div className="search-input-wrap">
          <input
            className="search-input"
            type="text"
            inputMode="search"
            placeholder="例：S4"
            value={endQuery}
            onChange={(e) => handleEndChange(e.target.value)}
          />
        </div>
        {endResults.length > 0 && (
          <div className="search-results">
            {endResults.map((p) => (
              <button
                key={p.id}
                type="button"
                className="search-result-item"
                onClick={() => pickEnd(p)}
              >
                <span>{p.name}</span>
                <span className="floor-tag">{floorLabels[p.floor]}</span>
              </button>
            ))}
          </div>
        )}
        {showEndEmpty && <div className="search-empty">該当する地点が見つかりません</div>}
      </div>

      <div className="route-actions">
        <button type="button" className="route-btn primary" onClick={handleSearch}>
          経路を検索
        </button>
        <button type="button" className="route-btn" onClick={handleClear}>
          クリア
        </button>
      </div>
      {error && <div className="search-empty">{error}</div>}
    </div>
  )
}
