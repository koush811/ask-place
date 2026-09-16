/** @type {Record<import("../types/room").RoomStatus, number>} */
export const ROOM_STATUS_ORDER = {
  empty: 0,
  somewhat_crowded: 1,
  crowded: 2,
};

/** @type {Record<import("../types/room").RoomStatus, string>} */
export const ROOM_STATUS_LABEL = {
  empty: "空",
  somewhat_crowded: "やや混雑",
  crowded: "混雑",
};

export const ROOM_STATUS_DEFAULT = "empty";
