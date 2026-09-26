import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useRooms } from "../context/RoomsContext";
import StatusBadge from "../components/StatusBadge";
import { isTrustedStorageUrl } from "../lib/firebase";

/**
 * 最終更新日時を読みやすい形式にフォーマット
 * @param {any} updatedAt
 * @returns {string}
 */
function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return "日時未記録";
  try {
    let date;
    if (typeof updatedAt.toDate === "function") {
      date = updatedAt.toDate();
    } else if (updatedAt instanceof Date) {
      date = updatedAt;
    } else {
      date = new Date(updatedAt);
    }
    return date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "日時未記録";
  }
}

/**
 * 部屋詳細ページ (/room/:id) - 仕様書 第7章
 */
export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRoomById, loading } = useRooms();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const room = getRoomById(id);

  // 存在しない部屋または非公開(enabled: false)の場合は / へリダイレクト (仕様書 第7.1章)
  useEffect(() => {
    if (!loading && !room) {
      navigate("/", { replace: true });
    }
  }, [loading, room, navigate]);

  if (loading) {
    return (
      <main className="room-detail-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>部屋情報を読み込み中...</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return null; // リダイレクト中
  }

  return (
    <main className="room-detail-page">
      <nav className="detail-breadcrumbs" aria-label="パンくずリスト">
        <Link to="/">← 校内マップ</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/rooms">展示一覧</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{room.roomName || room.id}</span>
      </nav>

      <article className="room-detail-card">
        {/* ヘッダー情報 */}
        <header className="detail-header">
          <div className="detail-badge-wrap">
            <span className="detail-floor-tag">{room.floor}階</span>
            <StatusBadge status={room.status} size="lg" />
          </div>
          <h1 className="detail-title">{room.title || "展示準備中"}</h1>
          <div className="detail-room-name">
            場所: <strong>{room.roomName || `${room.id}教室`}</strong> ({room.floor}F)
          </div>
        </header>

        {/* 写真表示エリア (仕様書 第7.2章) */}
        <section className="detail-image-section">
          {isTrustedStorageUrl(room.imageUrl) && !imgError ? (
            <div className="detail-image-wrapper">
              {!imgLoaded && <div className="image-skeleton">画像を読み込み中...</div>}
              <img
                src={room.imageUrl}
                alt={`${room.title || room.id} の展示写真`}
                className={`detail-image ${imgLoaded ? "loaded" : "loading"}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="detail-no-image">
              <div className="no-image-icon">📷</div>
              <p>現在、写真は登録されていません</p>
            </div>
          )}
        </section>

        {/* 展示説明 */}
        <section className="detail-description-section">
          <h2>展示・企画内容</h2>
          <p className="detail-description">
            {room.description || "展示の説明はまだ登録されていません。"}
          </p>
        </section>

        {/* 最終更新日時 & フッターメタ情報 */}
        <footer className="detail-footer-meta">
          <span className="detail-updated-at">
            最終更新: {formatUpdatedAt(room.updatedAt)}
          </span>
        </footer>
      </article>

      <div className="detail-actions">
        <Link to="/rooms" className="btn-secondary">
          展示一覧を見る
        </Link>
        <Link
          to={`/?room=${encodeURIComponent(room.id)}`}
          state={{ targetRoomId: room.id }}
          className="btn-primary"
        >
          校内マップで場所を確認
        </Link>
      </div>
    </main>
  );
}
