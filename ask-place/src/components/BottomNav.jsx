import { NavLink } from "react-router-dom";

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="ページ切り替え">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav-link${isActive ? " active" : ""}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5v11h13v-11M9 20.5v-7h6v7" />
        </svg>
        <span>校内マップ</span>
      </NavLink>
      <NavLink
        to="/rooms"
        className={({ isActive }) => `bottom-nav-link${isActive ? " active" : ""}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.5h16M4 12h16M4 18.5h16" />
          <circle cx="2" cy="5.5" r=".5" />
          <circle cx="2" cy="12" r=".5" />
          <circle cx="2" cy="18.5" r=".5" />
        </svg>
        <span>展示一覧</span>
      </NavLink>
    </nav>
  );
}
