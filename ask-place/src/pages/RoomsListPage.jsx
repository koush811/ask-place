import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useRooms } from "../context/RoomsContext";
import RoomList from "../components/RoomList";
import { ROOM_STATUS_ORDER } from "../lib/roomStatus";

/**
 * 展示一覧ページ (/rooms) - 仕様書 第6章
 */
export default function RoomsListPage() {
  const { rooms, loading } = useRooms();
  const [sortKey, setSortKey] = useState("floor"); // "floor" | "status"
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [searchWord, setSearchWord] = useState("");

  // ソートとフィルタリング
  const displayedRooms = useMemo(() => {
    let result = [...rooms];

    // フロア絞り込み
    if (selectedFloor !== "all") {
      const floorNum = Number(selectedFloor);
      result = result.filter((r) => r.floor === floorNum);
    }

    // キーワード検索 (部屋名、タイトル、説明)
    if (searchWord.trim()) {
      const q = searchWord.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.roomName && r.roomName.toLowerCase().includes(q)) ||
          r.id.toLowerCase().includes(q) ||
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    // ソート処理 (仕様書 第6.2章)
    if (sortKey === "floor") {
      result.sort((a, b) => (a.floor || 0) - (b.floor || 0));
    } else if (sortKey === "status") {
      result.sort(
        (a, b) =>
          (ROOM_STATUS_ORDER[a.status] ?? 0) -
          (ROOM_STATUS_ORDER[b.status] ?? 0)
      );
    }

    return result;
  }, [rooms, sortKey, selectedFloor, searchWord]);

  return (
    <main className="rooms-page">
      <div className="rooms-header-section">
        <div className="breadcrumb">
          <Link to="/">← トップへ戻る</Link>
        </div>
        <h1 className="page-title">展示・企画一覧</h1>
        <p className="page-subtitle">
          各教室の展示内容とリアルタイムな混雑状況を確認できます。
        </p>
      </div>

      <div className="rooms-controls">
        {/* ソート切り替え */}
        <div className="control-group">
          <label className="control-label">並び替え:</label>
          <div className="sort-buttons">
            <button
              type="button"
              className={`sort-btn ${sortKey === "floor" ? "active" : ""}`}
              onClick={() => setSortKey("floor")}
            >
              階数順 (1F〜5F)
            </button>
            <button
              type="button"
              className={`sort-btn ${sortKey === "status" ? "active" : ""}`}
              onClick={() => setSortKey("status")}
            >
              空いている順
            </button>
          </div>
        </div>

        {/* 階数フィルタ */}
        <div className="control-group">
          <label className="control-label" htmlFor="floor-filter">フロア:</label>
          <select
            id="floor-filter"
            className="filter-select"
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
          >
            <option value="all">すべての階</option>
            <option value="1">1階</option>
            <option value="2">2階</option>
            <option value="3">3階</option>
            <option value="4">4階</option>
            <option value="5">5階</option>
          </select>
        </div>

        {/* 検索入力 */}
        <div className="control-group search-group">
          <input
            type="text"
            className="search-input"
            placeholder="展示名や教室番号で検索..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
          />
          {searchWord && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchWord("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="rooms-result-bar">
        <span>該当件数: {displayedRooms.length} 件</span>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>展示情報を読み込み中...</p>
        </div>
      ) : (
        <RoomList rooms={displayedRooms} />
      )}
    </main>
  );
}
