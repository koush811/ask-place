import { useMemo, useState } from 'react'
import { useActivityData, buildRoomActivityMap } from '../utils/activities.js'

export default function SearchForm({ points, floorLabels, onSelectRoom }) {
  const [query, setQuery] = useState('')
  const activities = useActivityData()
  const roomActivityMap = useMemo(() => buildRoomActivityMap(activities), [activities])

  const searchable = useMemo(
    () =>
      points.filter(
        (p) => p.type === 'room' && roomActivityMap.has(p.name),
      ),
    [points, roomActivityMap],
  )

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return searchable.filter((p) => p.name.includes(q))
  }, [query, searchable])

  const showEmpty = query.trim().length > 0 && results.length === 0

  return (
    <div className="search-block">
      <div className="search-label">教室検索</div>
      <div className="search-input-wrap">
        <input
          className="search-input"
          type="text"
          inputMode="search"
          placeholder="例：S4"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="search-result-item"
              onClick={() => {
                onSelectRoom(r)
                setQuery('')
              }}
            >
              <span>{r.name}</span>
              <span className="floor-tag">{floorLabels[r.floor]}</span>
            </button>
          ))}
        </div>
      )}

      {showEmpty && <div className="search-empty">該当する教室が見つかりません</div>}
    </div>
  )
}
