import { useMemo, useState } from 'react'
import { findRoute } from '../utils/routing.js'

const FLOOR_LABELS = {
  floor_1F: '1F',
  floor_2F: '2F',
  floor_3F: '3F',
  floor_4F: '4F',
  floor_5F: '5F',
}

export default function RouteFinder({ points, onRouteComputed, onClear }) {
  const [startId, setStartId] = useState('')
  const [endId, setEndId] = useState('')
  const [error, setError] = useState('')

  const options = useMemo(
    () =>
      points
        .filter((p) => p.type === 'room' || p.type === 'stamp' || p.type === 'entrance')
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    [points],
  )

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
    const result = findRoute(points, undefined, startId, endId)
    if (!result.reachable) {
      setError('経路が見つかりません')
      onClear()
      return
    }
    onRouteComputed(result.segments)
  }

  const handleClear = () => {
    setStartId('')
    setEndId('')
    setError('')
    onClear()
  }

  return (
    <div className="route-block">
      <div className="search-label">道案内</div>
      <div className="route-selects">
        <select
          className="route-select"
          value={startId}
          onChange={(e) => setStartId(e.target.value)}
        >
          <option value="">出発地を選択</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}({FLOOR_LABELS[p.floor]})
            </option>
          ))}
        </select>
        <span className="route-arrow">→</span>
        <select
          className="route-select"
          value={endId}
          onChange={(e) => setEndId(e.target.value)}
        >
          <option value="">目的地を選択</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}({FLOOR_LABELS[p.floor]})
            </option>
          ))}
        </select>
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
