import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const NOTIFICATION_REF = doc(db, "settings", "notification");
const NotificationContext = createContext(undefined);

function normalizeNotification(data) {
  if (!data || data.enabled !== true) {
    return null;
  }

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const body = typeof data.body === "string" ? data.body.trim() : "";
  if (!title && !body) {
    return null;
  }

  return { title, body };
}

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      NOTIFICATION_REF,
      (snapshot) => {
        setNotification(snapshot.exists() ? normalizeNotification(snapshot.data()) : null);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("[Notification] 通知取得エラー:", snapshotError);
        setError(snapshotError);
        setNotification(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateNotification = useCallback(async ({ enabled, title, body }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("スーパー管理者としてログインしてから操作してください。");
    }

    const normalizedTitle = title.trim();
    const normalizedBody = body.trim();
    if (enabled && !normalizedTitle && !normalizedBody) {
      throw new Error("公開する通知にはタイトルまたは本文を入力してください。");
    }

    await setDoc(
      NOTIFICATION_REF,
      {
        enabled,
        title: normalizedTitle,
        body: normalizedBody,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      },
      { merge: true }
    );
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notification, loading, error, updateNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
