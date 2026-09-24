import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";

export default function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isPublished } = useSiteSettings();

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-brand">
        <Link to="/" className="header-title-link" onClick={closeMenu}>
          <h1>愛知総合工科高校 文化祭</h1>
          <p>校内マップ & 展示案内サイト</p>
        </Link>
      </div>

      {isPublished ? (
        <>
          <nav className={`header-nav ${menuOpen ? "open" : ""}`} aria-label="メインナビゲーション">
            <Link
              to="/"
              className={`nav-link ${isActive("/") ? "active" : ""}`}
              onClick={closeMenu}
            >
              校内マップ
            </Link>
            <Link
              to="/rooms"
              className={`nav-link ${isActive("/rooms") ? "active" : ""}`}
              onClick={closeMenu}
            >
              展示一覧
            </Link>
            <Link
              to="/admin"
              className={`nav-link admin-link ${isActive("/admin") ? "active" : ""}`}
              onClick={closeMenu}
            >
              管理者
            </Link>
          </nav>

          <button
            type="button"
            className={`hamberger ${menuOpen ? "active" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="メニューを開閉"
          >
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
          </button>
        </>
      ) : (
        <div className="header-actions-maintenance">
          <Link
            to="/admin"
            className={`nav-link admin-link ${isActive("/admin") ? "active" : ""}`}
            onClick={closeMenu}
          >
            管理者ログイン
          </Link>
        </div>
      )}
    </header>
  );
}
