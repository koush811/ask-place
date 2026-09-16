import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

/**
 * 配列をランダムにシャッフルする
 * @param {Array} array
 */
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 空いている展示優先のスライドショーコンポーネント (第5章)
 * @param {{ rooms: import("../types/room").Room[] }} props
 */
export default function Slideshow({ rooms }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  // status === "empty" の部屋から最大5部屋を選定
  const slides = useMemo(() => {
    const emptyRooms = (rooms || []).filter((r) => r.status === "empty");
    if (emptyRooms.length === 0) return [];
    if (emptyRooms.length <= 5) return emptyRooms;
    return shuffle(emptyRooms).slice(0, 5);
  }, [rooms]);

  // タイマーのリセットと自動送り (5秒間隔)
  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (slides.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
  };

  useEffect(() => {
    setCurrentIndex(0);
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides]);

  // 空部屋が1件もない場合は領域自体を非表示
  if (slides.length === 0) {
    return null;
  }

  const currentRoom = slides[currentIndex];

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    resetTimer();
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    resetTimer();
  };

  const handleSelect = () => {
    if (currentRoom) {
      navigate(`/room/${currentRoom.id}`);
    }
  };

  return (
    <section className="slideshow-section" aria-label="空いているおすすめ展示">
      <div className="slideshow-header">
        <span className="slideshow-tag">おすすめ（空いている展示）</span>
        <span className="slideshow-counter">
          {currentIndex + 1} / {slides.length}
        </span>
      </div>

      <div 
        className="slideshow-card" 
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleSelect(); }}
      >
        <button
          type="button"
          className="slide-nav-btn prev"
          onClick={handlePrev}
          aria-label="前の展示へ"
          disabled={slides.length <= 1}
        >
          ‹
        </button>

        <div className="slide-content">
          <div className="slide-room-meta">
            <span className="slide-room-name">
              {currentRoom.roomName || `${currentRoom.id}教室`}
            </span>
            <span className="slide-room-floor">{currentRoom.floor}階</span>
          </div>

          <h3 className="slide-room-title">
            {currentRoom.title || "展示準備中"}
          </h3>

          <div className="slide-status-wrap">
            <span className="slide-status-label">現在の状況:</span>
            <StatusBadge status={currentRoom.status} size="md" />
          </div>

          <div className="slide-tap-hint">タップして詳細を見る →</div>
        </div>

        <button
          type="button"
          className="slide-nav-btn next"
          onClick={handleNext}
          aria-label="次の展示へ"
          disabled={slides.length <= 1}
        >
          ›
        </button>
      </div>

      {slides.length > 1 && (
        <div className="slide-indicators">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`slide-dot ${idx === currentIndex ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
                resetTimer();
              }}
              aria-label={`スライド ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
