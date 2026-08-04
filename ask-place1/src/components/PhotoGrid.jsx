import { useState } from 'react'

export default function PhotoGrid({ photos, loading }) {
  const [lightboxUrl, setLightboxUrl] = useState(null)

  if (loading) {
    return <p className="photo-grid-status">読み込み中...</p>
  }

  if (photos.length === 0) {
    return <p className="photo-grid-status">まだ掲載されている写真はありません。</p>
  }

  return (
    <>
      <div className="photo-grid">
        {photos.map((p) => (
          <button
            key={p.pathname}
            type="button"
            className="photo-grid-item"
            onClick={() => setLightboxUrl(p.url)}
          >
            <img src={p.url} alt="来場者投稿の写真" loading="lazy" />
          </button>
        ))}
      </div>

      {lightboxUrl && (
        <div className="photo-lightbox" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="拡大表示" />
        </div>
      )}
    </>
  )
}
