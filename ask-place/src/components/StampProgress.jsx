export default function StampProgress({ stampRooms, collected }) {
  const total = stampRooms.length
  const done = stampRooms.filter((r) => collected.includes(r.name)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  return (
    <div className="stamp-block">
      <div className="stamp-header">
        <div className="search-label">スタンプラリー</div>
        <div className="stamp-count">{done} / {total}</div>
      </div>
      <div className="stamp-bar">
        <div className="stamp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="stamp-grid">
        {stampRooms.map((r) => (
          <div key={r.id} className={`stamp-chip${collected.includes(r.name) ? ' done' : ''}`}>
            {r.name}
          </div>
        ))}
      </div>
      {allDone && <div className="stamp-complete-banner">すべてのスタンプを取得しました</div>}
    </div>
  )
}
