import { useState } from 'react'
import { upload } from '@vercel/blob/client'
import { compressImage } from '../utils/compressImage.js'

export default function PhotoUploadForm({ onUploaded }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState('idle') // idle | compressing | uploading | done | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStatus('idle')
    setErrorMsg('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return

    try {
      setStatus('compressing')
      const compressed = await compressImage(file)

      setStatus('uploading')
      const filename = `pending/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${compressed.name}`

      await upload(filename, compressed, {
        access: 'public',
        handleUploadUrl: '/api/upload-token',
      })

      setStatus('done')
      setFile(null)
      setPreview(null)
      onUploaded?.()
    } catch (err) {
      setStatus('error')
      setErrorMsg('アップロードに失敗しました。もう一度お試しください。')
    }
  }

  return (
    <form className="photo-upload-form" onSubmit={handleSubmit}>
      <div className="search-label">写真を投稿する</div>
      <p className="photo-upload-note">
        投稿された写真は、確認後にギャラリーへ掲載されます。すぐには反映されません。
      </p>

      <label className="photo-file-picker">
        {preview ? (
          <img src={preview} alt="選択した写真のプレビュー" className="photo-preview" />
        ) : (
          <span>タップして写真を選ぶ</span>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          hidden
        />
      </label>

      <button
        type="submit"
        className="route-btn primary"
        disabled={!file || status === 'compressing' || status === 'uploading'}
      >
        {status === 'compressing' && '画像を処理中...'}
        {status === 'uploading' && 'アップロード中...'}
        {(status === 'idle' || status === 'done' || status === 'error') && '投稿する'}
      </button>

      {status === 'done' && (
        <div className="photo-upload-success">投稿ありがとうございます！確認後に掲載されます。</div>
      )}
      {status === 'error' && <div className="search-empty">{errorMsg}</div>}
    </form>
  )
}
