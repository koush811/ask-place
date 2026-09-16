import { useState } from "react";
import { loginWithUsername } from "../../lib/auth";

/**
 * 管理者ログイン画面 (/admin - 未ログイン時) - 仕様書 第8.1章
 * 入力項目は「ユーザー名(教室番号)」と「パスワード」のみ。メールアドレスという表現は使わない。
 */
export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("ユーザー名とパスワードを入力してください。");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const userCredential = await loginWithUsername(username, password);
      if (onLoginSuccess) {
        onLoginSuccess(userCredential.user);
      }
    } catch (err) {
      console.error("[Login] 認証エラー:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setErrorMsg("ユーザー名またはパスワードが正しくありません。");
      } else if (err.code === "auth/too-many-requests") {
        setErrorMsg("ログイン試行が多すぎます。しばらく待ってから再度お試しください。");
      } else if (
        err.code === "auth/api-key-not-valid" ||
        err.message?.includes("api-key-not-valid")
      ) {
        setErrorMsg("Firebase APIキーが無効です。.env の設定を確認し、開発サーバーを再起動してください。");
      } else {
        setErrorMsg("ログインに失敗しました。通信環境や入力内容をご確認ください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h2>管理者ログイン</h2>
          <p className="admin-login-sub">
            各クラス担当者および文化祭運営用の管理画面です
          </p>
        </div>

        {errorMsg && (
          <div className="admin-error-alert" role="alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-field">
            <label htmlFor="username">ユーザー名 (教室番号)</label>
            <input
              id="username"
              type="text"
              className="admin-input"
              placeholder="例: 301"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
            <span className="input-hint">配布された教室番号を入力してください</span>
          </div>

          <div className="form-field">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              className="admin-input"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="admin-submit-btn"
            disabled={loading}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className="admin-login-note">
          <p>
            ※ パスワードを紛失した場合は、文化祭運営本部へお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}
