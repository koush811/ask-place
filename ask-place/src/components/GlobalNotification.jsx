import { useNotification } from "../context/NotificationContext.jsx";

export default function GlobalNotification() {
  const { notification } = useNotification();
  if (!notification) return null;

  return (
    <div>
      <h2 className="search-label global-title">全体通知</h2>
      <aside className="global-notification" role="status" aria-live="polite">
        {notification.title && <h2>{notification.title}</h2>}
        {notification.body && <p>{notification.body}</p>}
      </aside>
    </div>
  );
}
