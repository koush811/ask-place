import { useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage, isConfigured } from '../firebase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { refreshActivitiesFromFirestore, useActivityData } from '../utils/activities.js'

const MAX_IMAGE_SIZE_MB = 5

export default function Admin() {
  const { user, logout } = useAuth()
  const activities = useActivityData()

  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [selectedRoom, setSelectedRoom] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingImageIndex, setDeletingImageIndex] = useState(null)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }
  const fileInputRef = useRef(null)

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) ?? null,
    [activities, selectedActivityId],
  )

  const existingRoomImages = useMemo(() => {
    if (!selectedActivity) return []
    return (selectedActivity.images ?? []).filter((img) => img.room === selectedRoom)
  }, [selectedActivity, selectedRoom])

  useEffect(() => {
    setDescription(selectedActivity?.description ?? '')
    setSelectedRoom('')
    setFile(null)
    setUploadProgress(null)
    setMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [selectedActivityId])

  useEffect(() => {
    let active = true

    const syncLatestActivities = async () => {
      if (!isConfigured) return
      try {
        const nextActivities = await refreshActivitiesFromFirestore()
        if (!active) return
        if (selectedActivityId && !nextActivities.some((activity) => activity.id === selectedActivityId)) {
          setSelectedActivityId('')
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
      }
    }

    syncLatestActivities()

    return () => {
      active = false
    }
  }, [selectedActivityId])

  const handleFileChange = (e) => {
    const nextFile = e.target.files?.[0]
    if (!nextFile) {
      setFile(null)
      return
    }
    if (nextFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setMessage({ type: 'error', text: `画像サイズは${MAX_IMAGE_SIZE_MB}MB以下にしてください` })
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFile(nextFile)
    setMessage(null)
  }

  const handleDeleteImage = async (imageIndex) => {
    if (!selectedActivity) return

    setDeletingImageIndex(imageIndex)
    setMessage(null)

    try {
      const docRef = doc(db, 'activities', selectedActivity.id)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) return

      const existingImages = docSnap.data().images ?? []
      const targetImage = existingImages[imageIndex]
      const nextImages = existingImages.filter((_, idx) => idx !== imageIndex)

      if (targetImage?.path) {
        await deleteObject(ref(storage, targetImage.path))
      }

      await updateDoc(docRef, { images: nextImages })
      setMessage({ type: 'success', text: '画像を削除しました' })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      setMessage({ type: 'error', text: '画像の削除に失敗しました。' })
    } finally {
      setDeletingImageIndex(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedActivity) {
      setMessage({ type: 'error', text: '展示を選択してください' })
      return
    }
    if (file && !selectedRoom) {
      setMessage({ type: 'error', text: '画像を追加する部屋を選択してください' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      let imageUrl = null

      if (file) {
        const safeName = file.name.replace(/[^\w.\-]/g, '_')
        const storagePath = `activities/${selectedActivity.id}/${selectedRoom}/${Date.now()}_${safeName}`
        const storageRef = ref(storage, storagePath)
        const task = uploadBytesResumable(storageRef, file)

        imageUrl = await new Promise((resolve, reject) => {
          task.on(
            'state_changed',
            (snapshot) => {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              setUploadProgress(pct)
            },
            (uploadError) => reject(uploadError),
            async () => {
              const url = await getDownloadURL(task.snapshot.ref)
              resolve({ url, path: storagePath })
            },
          )
        })
      }

      const docRef = doc(db, 'activities', selectedActivity.id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const updates = { description }
        if (imageUrl) {
          updates.images = arrayUnion({ room: selectedRoom, url: imageUrl.url, path: imageUrl.path })
        }
        await updateDoc(docRef, updates)
      } else {
        await setDoc(docRef, {
          name: selectedActivity.name,
          color: selectedActivity.color,
          rooms: selectedActivity.rooms,
          description,
          images: imageUrl ? [{ room: selectedRoom, url: imageUrl.url, path: imageUrl.path }] : [],
        })
      }

      await refreshActivitiesFromFirestore()

      setMessage({ type: 'success', text: '保存しました' })
      setFile(null)
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      setMessage({ type: 'error', text: '保存中にエラーが発生しました。もう一度お試しください。' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isConfigured) {
    return (
      <div className="admin-shell">
        <div className="admin-card">
          <h1>展示情報 管理画面</h1>
          <div className="admin-message error">
            Firebaseが設定されていません。環境変数(.env)を確認してください。
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <div className="admin-card admin-card-wide">
        <div className="admin-header-row">
          <h1>展示情報 管理画面</h1>
          <button type="button" className="admin-btn" onClick={logout}>
            ログアウト
          </button>
        </div>
        <p className="admin-user">{user?.email}</p>

        <form onSubmit={handleSubmit}>
          <label className="admin-label">
            展示を選択
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          {selectedActivity && (
            <>
              <label className="admin-label">
                部屋を選択(画像を追加する場合)
                <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
                  <option value="">選択してください</option>
                  {(selectedActivity.rooms || []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-label">
                説明文
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </label>

              <label className="admin-label">
                画像を追加({MAX_IMAGE_SIZE_MB}MBまで)
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </label>

              {uploadProgress !== null && (
                <div className="admin-progress-bar">
                  <div className="admin-progress-fill" style={{ width: `${uploadProgress}%` }} />
                  <span className="admin-progress-label">{uploadProgress}%</span>
                </div>
              )}

              {selectedRoom && existingRoomImages.length > 0 && (
                <div className="admin-image-grid">
                  {existingRoomImages.map((img, i) => (
                    <div key={`${img.room}-${i}`} className="admin-image-item">
                      <img src={img.url} alt={img.room} loading="lazy" />
                      <span>{img.room}</span>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => handleDeleteImage(i)}
                        disabled={deletingImageIndex === i}
                      >
                        {deletingImageIndex === i ? '削除中…' : '削除'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {message && <div className={`admin-message ${message.type}`}>{message.text}</div>}

              <button type="submit" className="admin-btn primary" disabled={submitting}>
                {submitting ? '保存中…' : '送信'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
