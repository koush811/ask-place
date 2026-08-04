import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

// APIキーなどはコードに直接書かず、.env(VITE_FIREBASE_*)から読み込む。
// .env は .gitignore 済み。実際の値は .env.example を参考に各自で用意する。
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

let app = null
let db = null
let storage = null
let auth = null

if (isConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  db = getFirestore(app)
  storage = getStorage(app)
  auth = getAuth(app)
} else {
  // 環境変数が無くても公開ページ自体は activity.json のデータで動作し続ける
  // (詳しくは src/utils/activities.js / src/hooks/useFirebaseActivitiesSync.js を参照)
  console.warn(
    '[firebase] VITE_FIREBASE_* の環境変数が設定されていません。Firebase機能(管理画面・リアルタイム更新)は無効のままです。',
  )
}

export { app, db, storage, auth, isConfigured }
