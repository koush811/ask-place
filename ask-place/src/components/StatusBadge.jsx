import { ROOM_STATUS_LABEL } from "../lib/roomStatus";

/**
 * 混雑状況バッジコンポーネント
 * @param {{ status: import("../types/room").RoomStatus, size?: "sm" | "md" | "lg" }} props
 */
export default function StatusBadge({ status, size = "md" }) {
  const label = ROOM_STATUS_LABEL[status] || "不明";
  
  const statusClasses = {
    empty: "status-badge status-empty",
    somewhat_crowded: "status-badge status-somewhat",
    crowded: "status-badge status-crowded",
  };

  const badgeClass = `${statusClasses[status] || "status-badge"} size-${size}`;

  return (
    <span className={badgeClass}>
      <span className="status-dot"></span>
      {label}
    </span>
  );
}
