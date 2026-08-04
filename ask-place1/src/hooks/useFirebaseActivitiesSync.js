import { useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db, isConfigured } from '../firebase.js'
import { mergeActivitiesWithFirestore, updateActivityStore } from '../utils/activities.js'
import fallbackActivities from '../data/activity.json'

/**
 * Firestore の `activities` コレクションをリアルタイム購読し、
 * 変更があるたびに src/utils/activities.js の共有ストアを更新する。
 * App.jsx で一度だけ呼び出す想定。
 *
 * - Firebaseが未設定(.envが無い等)の場合は何もせず、activity.json のままになる
 * - Firestoreにまだ1件もドキュメントが無い場合も activity.json のままになる
 *   (初期データとして activity.json を使う、という要件に対応)
 * - 通信エラー時も activity.json にフォールバックする(公開ページを壊さない)
 */
export function useFirebaseActivitiesSync() {
  useEffect(() => {
    if (!isConfigured || !db) {
      return undefined
    }

    const unsubscribe = onSnapshot(
      collection(db, 'activities'),
      (snapshot) => {
        if (snapshot.empty) {
          updateActivityStore(fallbackActivities)
          return
        }
        const activities = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        updateActivityStore(mergeActivitiesWithFirestore(fallbackActivities, activities))
      },
      (error) => {
        // eslint-disable-next-line no-console
        console.error('[firebase] activities の購読に失敗しました。静的データを使用します。', error)
        updateActivityStore(fallbackActivities)
      },
    )

    return unsubscribe
  }, [])
}
