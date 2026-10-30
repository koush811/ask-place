import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import BottomNav from "./components/BottomNav.jsx";
import { RoomsProvider, useRooms } from "./context/RoomsContext.jsx";
import { useSiteSettings } from "./context/SiteSettingsContext.jsx";

function RoomsDataNotice() {
  const { rooms, error, refreshing, refreshRooms } = useRooms();
  if (!error) return null;

  return (
    <div role="alert" style={{ margin: "12px", padding: "12px", background: "#fff1f2", color: "#9f1239", borderRadius: "8px" }}>
      <p style={{ margin: "0 0 8px" }}>
        {rooms.length > 0
          ? "最新の部屋データを取得できませんでした。表示中のデータをそのまま表示しています。"
          : "部屋データを読み込めませんでした。通信状態を確認して再試行してください。"}
      </p>
      <button type="button" onClick={refreshRooms} disabled={refreshing}>
        {refreshing ? "再取得中..." : "再試行"}
      </button>
    </div>
  );
}

function SiteSettingsErrorPage() {
  return (
    <main className="maintenance-page">
      <div className="maintenance-card" role="alert">
        <h1 className="maintenance-title">サイト設定を読み込めませんでした</h1>
        <p className="maintenance-desc">通信状態を確認して、もう一度お試しください。</p>
        <button type="button" className="maintenance-admin-btn" onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </div>
    </main>
  );
}

function MaintenancePage() {
  return (
    <main className="maintenance-page">
      <div className="maintenance-card">
        <div className="maintenance-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="56"
            height="56"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 className="maintenance-title">現在は準備中です</h1>
        <p className="maintenance-desc">
          ただいま文化祭サイトの公開準備を行っております。<br />
          公開まで今しばらくお待ちください。
        </p>
        <a href="/admin" className="maintenance-admin-btn">
          管理者ログイン
        </a>
      </div>
    </main>
  );
}

export default function App() {
  const { isPublished, loading, error: siteSettingsError } = useSiteSettings();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");
  const closedPageRedirected = useRef(false);

  useEffect(() => {
    if (loading || siteSettingsError || isPublished || isAdminPath || closedPageRedirected.current) return;

    closedPageRedirected.current = true;
    window.location.replace("/closed.html");
  }, [loading, siteSettingsError, isPublished, isAdminPath]);

  if (loading && !isAdminPath) {
    return (
      <div className="app-shell">
        <main className="maintenance-page" aria-busy="true">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>サイト設定を確認中...</p>
          </div>
        </main>
      </div>
    );
  }

  if (siteSettingsError && !isAdminPath) {
    return <SiteSettingsErrorPage />;
  }

  // サイト非公開時は /admin 以外のすべてのページを / にリダイレクト
  if (!loading && !isPublished) {
    if (!isAdminPath) {
      return (
        <div className="app-shell">
          <Header />
          <MaintenancePage />
        </div>
      );
    }
  }

  return (
    <div className="app-shell">
      <Header />
      {isAdminPath ? (
        <div className="app-main-content">
          <Outlet />
        </div>
      ) : (
        <RoomsProvider>
          <RoomsDataNotice />
          <div className="app-main-content">
            <Outlet />
          </div>
        </RoomsProvider>
      )}
      {!isAdminPath && <BottomNav />}
      <Footer />
    </div>
  );
}
