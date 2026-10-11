import { useMemo, useState } from 'react'
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
        <div className="search-select-wrap">
          <select
            className="search-select"
            value=""
            onChange={(e) => {
              const selected = results.find((r) => r.id === e.target.value);
              if (selected) {
                onSelectRoom(selected);
                onForceRoom?.(selected.name);
                setQuery("");
              }
            }}
            aria-label="教室の候補一覧"
          >
            <option value="" disabled>
              候補を選択してください（{results.length}件）
            </option>
            {results.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}（{floorLabels[r.floor]}）
              </option>
            ))}
          </select>
        </div>
      )}

      {showEmpty && <div className="search-empty">該当する教室が見つかりません</div>}
    </div>
  )
}
