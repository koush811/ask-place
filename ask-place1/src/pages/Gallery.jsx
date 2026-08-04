import { useCallback, useEffect, useState } from 'react'
import PhotoUploadForm from '../components/PhotoUploadForm.jsx'
import PhotoGrid from '../components/PhotoGrid.jsx'

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/photos')
      const data = await res.json()
      setPhotos(data.photos ?? [])
    } catch {
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPhotos()
  }, [loadPhotos])

  return (
    <>
      <section className="hero">
        <span className="crop tl" />
        <span className="crop br" />
        <h2 className="hero-title">写真ギャラリー</h2>
        <p className="hero-sub">
          当日の様子をぜひ投稿してください。確認後にこのページへ掲載されます。
        </p>
      </section>

      <PhotoUploadForm onUploaded={loadPhotos} />

      <section className="map-section">
        <div className="search-label">みんなの投稿</div>
        <PhotoGrid photos={photos} loading={loading} />
      </section>
    </>
  )
}
