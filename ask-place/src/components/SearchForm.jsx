import { useMemo, useState } from 'react'
import { isRoomVisible } from '../utils/activities.js'
import { matchesSearchText } from '../utils/search.js'

export default function SearchForm({ points, floorLabels, onSelectRoom, onForceRoom, }) {
  const [query, setQuery] = useState('')

  const searchable = useMemo(
    () =>
      points.filter(
        (p) => p.type === 'room'
      ),
    [points],
  )

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return searchable.filter((p) => matchesSearchText(p.name, q))
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
          placeholder="例：N101"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
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
                onSelectRoom(r);
                onForceRoom?.(r.name);
                setQuery("");
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
