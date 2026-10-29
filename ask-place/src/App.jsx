import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import BottomNav from "./components/BottomNav.jsx";
import { RoomsProvider } from "./context/RoomsContext.jsx";
import { useSiteSettings } from "./context/SiteSettingsContext.jsx";

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
    <RoomsProvider>
      <div className="app-shell">
        <Header />
        <div className="app-main-content">
          <Outlet />
        </div>
        {!isAdminPath && <BottomNav />}
        <Footer />
      </div>
    </RoomsProvider>
  );
}
