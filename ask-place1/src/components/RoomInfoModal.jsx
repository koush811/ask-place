import { useMemo } from 'react'
import { useActivityData, buildRoomActivityMap } from '../utils/activities.js'

const FLOOR_LABELS = {
  floor_1F: '1階',
  floor_2F: '2階',
  floor_3F: '3階',
  floor_4F: '4階',
  floor_5F: '5階',
}

export default function RoomInfoModal({ room, onClose }) {
  const activities = useActivityData()
  const roomActivityMap = useMemo(() => buildRoomActivityMap(activities), [activities])

  if (!room) return null

  const activity = room.type === 'room' ? roomActivityMap.get(room.name) ?? null : null
  const roomImages = (activity?.images ?? []).filter((img) => img.room === room.name)

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="room-card"
        style={activity ? { borderTopColor: activity.color } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tag" style={activity ? { color: activity.color } : undefined}>
          {activity ? activity.name : 'ROOM INFO'}
        </div>
        <h2>{room.name}</h2>
        <div className="rows">
          <div className="row">
            <span>部屋番号</span>
            <b>{room.name}</b>
          </div>
          <div className="row">
            <span>フロア</span>
            <b>{FLOOR_LABELS[room.floor] ?? room.floor}</b>
          </div>
          {activity && (
            <div className="row">
              <span>展示</span>
              <b>{activity.name}</b>
            </div>
          )}
        </div>
        {activity?.description && (
          <div className="activity-note" style={{ borderColor: activity.color }}>
            {activity.description}
          </div>
        )}
        {roomImages.length > 0 && (
          <div className="room-image-grid">
            {roomImages.map((img, i) => (
              <img key={`${img.room}-${i}`} src={img.url} alt={`${room.name}の写真`} loading="lazy" />
            ))}
          </div>
        )}
        <button className="close" onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}
