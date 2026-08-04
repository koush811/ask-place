import { useSyncExternalStore } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db, isConfigured } from '../firebase.js'
import fallbackActivities from '../data/activity.json'

export function mergeActivitiesWithFirestore(localActivities, firestoreActivities = []) {
  const firestoreMap = new Map(
    firestoreActivities.map((activity) => [activity.id, activity]),
  )

  return localActivities.map((activity) => {
    const firestoreActivity = firestoreMap.get(activity.id)
    if (!firestoreActivity) {
      return activity
    }

    return {
      ...activity,
      ...firestoreActivity,
      id: activity.id,
      name: activity.name,
      color: activity.color,
      rooms: activity.rooms,
    }
  })
}

/**
 * 展示情報(activities)のシンプルな外部ストア。
 * - 初期値は activity.json
 * - Firestoreからリアルタイム更新が来ると updateActivityStore() で差し替えられ、
 *   useActivityData() を使っているコンポーネントは自動的に再描画される
 *   (Firestore通信自体は useFirebaseActivitiesSync フックが担当する)
 */
let currentActivities = fallbackActivities
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return currentActivities
}

function getServerSnapshot() {
  return fallbackActivities
}

/** Firestoreからのデータでストアを更新する(useFirebaseActivitiesSyncから呼ばれる) */
export function updateActivityStore(nextActivities) {
  currentActivities = nextActivities
  notify()
}

/** 展示情報の配列を購読するフック。Firestore更新時に自動で再描画される。 */
export function useActivityData() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export async function refreshActivitiesFromFirestore() {
  if (!isConfigured || !db) {
    return fallbackActivities
  }

  const snapshot = await getDocs(collection(db, 'activities'))
  const firestoreActivities = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))

  const nextActivities = mergeActivitiesWithFirestore(fallbackActivities, firestoreActivities)
  updateActivityStore(nextActivities)
  return nextActivities
}

/** 部屋番号(name) -> 展示情報 の対応表を作る */
export function buildRoomActivityMap(activities) {
  const map = new Map()
  activities.forEach((act) => {
    ;(act.rooms || []).forEach((roomName) => map.set(roomName, act))
  })
  return map
}

/**
 * レンダー外(イベントハンドラ内など)で今の展示情報を参照したい場合のヘルパー。
 * レンダー中に使う場合は useActivityData() + buildRoomActivityMap() を使うこと
 * (こちらはストア更新時の自動再描画をトリガーしない)。
 */
export function getActivityForRoom(roomName) {
  return buildRoomActivityMap(currentActivities).get(roomName) ?? null
}

export function isRoomVisible(roomName) {
  return buildRoomActivityMap(currentActivities).has(roomName)
}

export { fallbackActivities as activityData }
