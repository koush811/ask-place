import RoomCard from "./RoomCard";

/**
 * 展示カードリストコンポーネント
 * @param {{ rooms: import("../types/room").Room[] }} props
 */
export default function RoomList({ rooms }) {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="empty-rooms-message">
        <p>該当する展示が見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="room-cards-grid">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
