/**
 * @typedef {"empty" | "somewhat_crowded" | "crowded"} RoomStatus
 * 表示用ラベル: empty="空", somewhat_crowded="やや混雑", crowded="混雑"
 */

/**
 * @typedef {Object} Room
 * @property {string} id              - roomId。例: "301"
 * @property {string} title           - 展示タイトル
 * @property {string} description     - 展示説明
 * @property {number} floor           - 階数(1〜5)
 * @property {string|null} imageUrl   - Storageの画像URL。未設定ならnull
 * @property {RoomStatus} status      - 混雑状況
 * @property {boolean} enabled        - 公開フラグ
 * @property {import("firebase/firestore").Timestamp} updatedAt - 最終更新日時
 * @property {string} [roomName]      - 部屋名(教室番号の表示名。例: "3年1組")
 */

/**
 * @typedef {"class_admin" | "super_admin"} UserRole
 */

/**
 * @typedef {Object} AdminUser
 * @property {UserRole} role
 * @property {string} [roomId] - class_adminの場合のみ必須
 */

export {}; // このファイルをモジュールとして扱うための空export
