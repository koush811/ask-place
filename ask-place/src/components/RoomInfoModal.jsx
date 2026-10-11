import { Link } from 'react-router-dom'

const FLOOR_LABELS = {
  floor_1F: '1階',
  floor_2F: '2階',
  floor_3F: '3階',
  floor_4F: '4階',
  floor_5F: '5階',
}

export default function RoomInfoModal({ room, hasDetailPage = false, onClose, onShowMap }) {
  if (!room) return null

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="room-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tag">ROOM INFO</div>
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
        </div>
        
        {room.type === 'room' && hasDetailPage && (
          <Link className="detail-link" to={`/room/${room.name || room.id}`} onClick={onClose}>
            詳細を見る
          </Link>
        )}
        {room.type === 'room' && onShowMap && (
          <button type="button" className="map-location-link" onClick={onShowMap}>
            マップで位置を確認
          </button>
        )}
        <button className="close" onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}
