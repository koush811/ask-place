import { useMemo, useState } from 'react'

const FLOOR_LABELS = {
  floor_1F: '1F',
  floor_2F: '2F',
  floor_3F: '3F',
  floor_4F: '4F',
  floor_5F: '5F',
}

export default function SearchForm({ points, onSelectRoom }) {
  const [query, setQuery] = useState('')

  const searchable = useMemo(
    () => points.filter((p) => p.type === 'room' || p.type === 'stamp'),
    [points],
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
              <span className="floor-tag">{FLOOR_LABELS[r.floor]}</span>
            </button>
          ))}
        </div>
      )}

      {showEmpty && <div className="search-empty">該当する教室が見つかりません</div>}
    </div>
  )
}
