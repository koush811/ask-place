import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const SiteSettingsContext = createContext(undefined);

/**
 * サイト全体の設定（公開・非公開など）を管理するProvider
 * Firestoreの settings/site をリアルタイムで監視する
 */
export function SiteSettingsProvider({ children }) {
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const docRef = doc(db, "settings", "site");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // isPublished が明示的に false の場合のみ非公開。未設定または true の場合は公開中
          setIsPublished(data.isPublished !== false);
        } else {
          // ドキュメントが存在しない初期状態は公開中
          setIsPublished(true);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[SiteSettings] サイト設定取得エラー:", err);
        setError(err);
        // エラー時でもサイトが一切閲覧できなくなるのを防ぐため、デフォルトで公開とする
        setIsPublished(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /**
   * サイトの公開・非公開を切り替える（全体管理者のみ実行可能）
   * @param {boolean} nextPublished - true: 公開, false: 非公開
   * @param {string} [uid] - 操作したスーパー管理者のUID
   */
  const toggleSitePublish = useCallback(async (nextPublished, uid) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("管理者としてログインしてから操作してください。");
    }

    const docRef = doc(db, "settings", "site");
    await setDoc(
      docRef,
      {
        isPublished: nextPublished,
        updatedAt: serverTimestamp(),
        updatedBy: uid || currentUser.uid,
      },
      { merge: true }
    );
  }, []);

  return (
    <SiteSettingsContext.Provider
      value={{
        isPublished,
        loading,
        error,
        toggleSitePublish,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

/**
 * サイト設定Contextを利用するためのカスタムフック
 */
export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) {
    throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  }
  return ctx;
}
