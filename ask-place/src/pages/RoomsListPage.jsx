import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useRooms } from "../context/RoomsContext";
import RoomList from "../components/RoomList";

/**
 * 展示一覧ページ (/rooms) - 仕様書 第6章
 */
export default function RoomsListPage() {
  const { rooms, loading, refreshing, refreshRooms } = useRooms();
  const [sortKey, setSortKey] = useState("floor");
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
          各教室の展示内容を確認できます。
        </p>
        <button
          type="button"
          className="rooms-refresh-btn"
          onClick={refreshRooms}
          disabled={refreshing}
        >
          {refreshing ? "再取得中..." : "最新情報を再取得"}
        </button>
      </div>

      <div className="rooms-controls">
        

        {/* 階数フィルタ */}
        <div className="floor-filter-control">
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
        <div className="search-group">
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
