import { useNotification } from "../context/NotificationContext.jsx";

export default function GlobalNotification() {
  const { notification } = useNotification();
  if (!notification) return null;

  return (
    <div>
      <div className="srogan" style={{margin:"10px 18px"}}>
        <div className="search-label">文化祭へようこそ</div>
        <label>
          スローガン
          <h2 style={{margin:"5px 0px"}}>愛総愛添う</h2>
        </label>
        <label>
          期間
          <h3 style={{margin:"5px 0px"}}>10/30～10/31</h3>
        </label>
      </div>
      <h2 className="search-label global-title">全体通知</h2>
      <aside className="global-notification" role="alert" aria-live="assertive">
        {notification.title && <h2>{notification.title}</h2>}
        {notification.body && <p>{notification.body}</p>}
      </aside>
    </div>
  );
}
