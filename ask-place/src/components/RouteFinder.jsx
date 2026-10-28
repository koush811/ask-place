import { useMemo, useState } from 'react'
import { findRoute } from '../utils/routing.js'
import { matchesSearchText } from '../utils/search.js'

export default function RouteFinder({ mapData, rooms = [], onRouteComputed, onClear }) {
  const { nodes } = mapData

  const [startQuery, setStartQuery] = useState('')
  const [startId, setStartId] = useState('')
  const [endQuery, setEndQuery] = useState('')
  const [endId, setEndId] = useState('')
  const [error, setError] = useState('')

  const options = useMemo(
    () => {
      const publishedRoomIds = new Set(
        rooms.flatMap((room) => [room.id, room.roomName]).filter(Boolean),
      )
      return nodes
        .filter(
          (p) =>
            p.type === 'entrance' ||
            (p.type === 'room' && (publishedRoomIds.has(p.id) || publishedRoomIds.has(p.name))),
        )
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    },
    [nodes, rooms],
  )

  const startResults = useMemo(() => {
    const q = startQuery.trim()
    if (!q || startId) return []
    return options.filter((p) => matchesSearchText(p.name, q))
  }, [startQuery, startId, options])

  const endResults = useMemo(() => {
    const q = endQuery.trim()
    if (!q || endId) return []
    return options.filter((p) => matchesSearchText(p.name, q))
  }, [endQuery, endId, options])

  const showStartEmpty = startQuery.trim().length > 0 && !startId && startResults.length === 0
  const showEndEmpty = endQuery.trim().length > 0 && !endId && endResults.length === 0

  const getOptionLabel = (point) => {
    if (point.type !== 'room') return point.name
    const room = rooms.find((item) =>
      item.id === point.id || item.id === point.name ||
      item.roomName === point.id || item.roomName === point.name
    )
    return `${point.name}（${room?.title || '展示未登録'}）`
  }

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
    if (!options.some((point) => point.id === startId) || !options.some((point) => point.id === endId)) {
      setError('選択した部屋は現在公開されていないため、経路を検索できません。')
      onClear()
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
    onRouteComputed(result.segments, { startId, endId })
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
            placeholder="例：受付"
            value={startQuery}
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </div>
        {startResults.length > 0 && (
          <div className="search-select-wrap">
            <select
              className="search-select"
              value=""
              onChange={(e) => {
                const p = options.find((opt) => opt.id === e.target.value);
                if (p) pickStart(p);
              }}
              aria-label="出発地の候補一覧"
            >
              <option value="" disabled>
                候補を選択してください（{startResults.length}件）
              </option>
              {startResults.map((p) => (
                <option key={p.id} value={p.id}>
                  {getOptionLabel(p)}
                </option>
              ))}
            </select>
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
            placeholder="例：N101"
            value={endQuery}
            onChange={(e) => handleEndChange(e.target.value)}
          />
        </div>
        {endResults.length > 0 && (
          <div className="search-select-wrap">
            <select
              className="search-select"
              value=""
              onChange={(e) => {
                const p = options.find((opt) => opt.id === e.target.value);
                if (p) pickEnd(p);
              }}
              aria-label="目的地の候補一覧"
            >
              <option value="" disabled>
                候補を選択してください（{endResults.length}件）
              </option>
              {endResults.map((p) => (
                <option key={p.id} value={p.id}>
                  {getOptionLabel(p)}
                </option>
              ))}
            </select>
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
