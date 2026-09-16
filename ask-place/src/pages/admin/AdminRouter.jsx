import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { getUserRole, logout } from "../../lib/auth";
import LoginPage from "./LoginPage";
import ClassAdminPage from "./ClassAdminPage";
import SuperAdminPage from "./SuperAdminPage";

/**
 * 管理画面のルーティング・認証判定コンポーネント (/admin/*)
 */
export default function AdminRouter() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoleData, setUserRoleData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const roleData = await getUserRole(user.uid);
          setUserRoleData(roleData);
        } catch (err) {
          console.error("[AdminRouter] ロール取得エラー:", err);
          setUserRoleData(null);
        }
      } else {
        setCurrentUser(null);
        setUserRoleData(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setUserRoleData(null);
    } catch (err) {
      console.error("[AdminRouter] ログアウト失敗:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="admin-page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 1. 未ログイン時 -> ログイン画面
  if (!currentUser) {
    return <LoginPage />;
  }

  // 2. ログイン済みだが Firestore にユーザー情報が見つからない場合
  if (!userRoleData) {
    return (
      <div className="admin-page-container">
        <div className="admin-error-card">
          <h2>⚠️ 権限が見つかりません</h2>
          <p>
            ログインしたアカウント (UID: {currentUser.uid}) に管理者ロールが割り当てられていません。
          </p>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            ログアウトして戻る
          </button>
        </div>
      </div>
    );
  }

  // 3. スーパー管理者
  if (userRoleData.role === "super_admin") {
    return (
      <SuperAdminPage
        user={{ uid: currentUser.uid, ...userRoleData }}
        onLogout={handleLogout}
      />
    );
  }

  // 4. クラス管理者
  if (userRoleData.role === "class_admin") {
    return (
      <ClassAdminPage
        user={{ uid: currentUser.uid, ...userRoleData }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-error-card">
        <p>未対応の管理者種別です。</p>
        <button type="button" className="admin-logout-btn" onClick={handleLogout}>
          ログアウト
        </button>
      </div>
    </div>
  );
}
