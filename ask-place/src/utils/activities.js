import activityData from '../data/activity.json'

// 部屋番号(name) -> 展示情報(activity.jsonの1要素) の対応表
const roomActivityMap = new Map()
activityData.forEach((act) => {
  act.rooms.forEach((roomName) => {
    roomActivityMap.set(roomName, act)
  })
})

/**
 * 部屋番号から、その部屋が属する展示情報を取得する。
 * @param {string} roomName
 * @returns {Object|null} activity.jsonの1要素、無ければnull
 */
export function getActivityForRoom(roomName) {
  return roomActivityMap.get(roomName) ?? null
}

/**
 * その部屋番号がactivity.jsonに登録されている(=マップ上に表示すべき)かどうか。
 * @param {string} roomName
 * @returns {boolean}
 */
export function isRoomVisible(roomName) {
  return roomActivityMap.has(roomName)
}

export { activityData }
