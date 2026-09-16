import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

/**
 * 展示カードコンポーネント (画像なし・通信量削減)
 * @param {{ room: import("../types/room").Room }} props
 */
export default function RoomCard({ room }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/room/${room.id}`);
  };

  return (
    <div
      className="room-list-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="room-card-header">
        <span className="room-card-number">{room.roomName || room.id}</span>
        <span className="room-card-floor">{room.floor}F</span>
      </div>

      <h3 className="room-card-title">{room.title || "展示名未設定"}</h3>

      {room.description && (
        <p className="room-card-desc-snippet">{room.description}</p>
      )}

      <div className="room-card-footer">
        <StatusBadge status={room.status} size="sm" />
        <span className="room-card-arrow">詳細 →</span>
      </div>
    </div>
  );
}
