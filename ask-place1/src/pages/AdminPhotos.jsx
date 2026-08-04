import { useCallback, useEffect, useState } from 'react'

const PASSCODE_KEY = 'adminPasscode'

export default function AdminPhotos() {
  const [passcode, setPasscode] = useState(sessionStorage.getItem(PASSCODE_KEY) || '')
  const [unlocked, setUnlocked] = useState(false)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyPath, setBusyPath] = useState(null)

  const loadPending = useCallback(async (code) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/pending', {
        headers: { 'x-admin-passcode': code },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '取得に失敗しました')
      }
      const data = await res.json()
      setPending(data.photos ?? [])
      setUnlocked(true)
      sessionStorage.setItem(PASSCODE_KEY, code)
    } catch (err) {
      setError(err.message)
      setUnlocked(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (passcode) loadPending(passcode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUnlock = (e) => {
    e.preventDefault()
    loadPending(passcode)
  }

  const handleApprove = async (photo) => {
    setBusyPath(photo.pathname)
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-passcode': passcode },
        body: JSON.stringify({ pathname: photo.pathname, url: photo.url }),
      })
      if (!res.ok) throw new Error()
      setPending((prev) => prev.filter((p) => p.pathname !== photo.pathname))
    } catch {
      setError('承認に失敗しました')
    } finally {
      setBusyPath(null)
    }
  }

  const handleReject = async (photo) => {
    setBusyPath(photo.pathname)
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-passcode': passcode },
        body: JSON.stringify({ url: photo.url }),
      })
      if (!res.ok) throw new Error()
      setPending((prev) => prev.filter((p) => p.pathname !== photo.pathname))
    } catch {
      setError('却下に失敗しました')
    } finally {
      setBusyPath(null)
    }
  }

  if (!unlocked) {
    return (
      <section className="search-block">
        <div className="search-label">写真の承認(管理者用)</div>
        <form onSubmit={handleUnlock}>
          <input
            className="search-input"
            type="password"
            placeholder="合言葉を入力"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <button type="submit" className="route-btn primary" style={{ marginTop: 10, width: '100%' }}>
            確認
          </button>
        </form>
        {error && <div className="search-empty">{error}</div>}
      </section>
    )
  }

  return (
    <section className="map-section">
      <div className="search-label">承認待ちの写真({pending.length}件)</div>
      {loading && <p className="photo-grid-status">読み込み中...</p>}
      {!loading && pending.length === 0 && (
        <p className="photo-grid-status">承認待ちの写真はありません。</p>
      )}

      <div className="admin-photo-list">
        {pending.map((p) => (
          <div key={p.pathname} className="admin-photo-item">
            <img src={p.url} alt="承認待ちの写真" />
            <div className="admin-photo-actions">
              <button
                type="button"
                className="route-btn primary"
                disabled={busyPath === p.pathname}
                onClick={() => handleApprove(p)}
              >
                承認
              </button>
              <button
                type="button"
                className="route-btn danger"
                disabled={busyPath === p.pathname}
                onClick={() => handleReject(p)}
              >
                却下
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <div className="search-empty">{error}</div>}
    </section>
  )
}
