import { useState } from "react";
import { Link } from "react-router-dom";
import mapData from "../data/campus_map_data.json";
import FloorSelector from "../components/FloorSelector.jsx";
import SearchForm from "../components/SearchForm.jsx";
import RouteFinder from "../components/RouteFinder.jsx";
import MapView, { MapLegend } from "../components/MapView.jsx";
import Slideshow from "../components/Slideshow.jsx";
import RoomInfoModal from "../components/RoomInfoModal.jsx";
import { useRooms } from "../context/RoomsContext";

const { nodes, zones, floorOrder, floorLabels } = mapData;

function getVisibleRouteSegments(segments) {
  return (segments || []).filter((seg) =>
    seg.points.some((point) => point.type !== "stairs")
  );
}

/**
 * トップページ (/) - 仕様書 第5章
 */
export default function HomePage() {
  const { rooms } = useRooms();

  const [activeFloor, setActiveFloor] = useState(floorOrder[0]);
  const [highlightedId, setHighlightedId] = useState(null);
  const [routeSegments, setRouteSegments] = useState([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [forcedRoom, setForcedRoom] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const visibleRouteSegments = getVisibleRouteSegments(routeSegments);
  const routeFloors =
    visibleRouteSegments.length > 0
      ? visibleRouteSegments.map((seg) => seg.floor)
      : null;

  // マップ上の部屋を選択した時は、まず概要モーダルを表示する
  const handleSelectRoom = (point) => {
    if (point.type === "room") {
      setSelectedRoom(point);
      return;
    }

    // 入口やその他の場合はマップ上でハイライト
    if (point.floor !== activeFloor) {
      setActiveFloor(point.floor);
    }
    setHighlightedId(point.id);
  };

  const handleRouteComputed = (segments) => {
    setRouteSegments(segments);
    setSegmentIndex(0);
    const visibleSegments = getVisibleRouteSegments(segments);
    if (visibleSegments.length > 0) {
      setActiveFloor(visibleSegments[0].floor);
    } else if (segments.length > 0) {
      setActiveFloor(segments[0].floor);
    }
  };

  const handleClearRoute = () => {
    setRouteSegments([]);
    setSegmentIndex(0);
  };

  const goToSegment = (index) => {
    if (index < 0 || index >= visibleRouteSegments.length) return;
    setSegmentIndex(index);
    setActiveFloor(visibleRouteSegments[index].floor);
  };

  const handleFloorChange = (floorKey) => {
    setActiveFloor(floorKey);
    if (visibleRouteSegments.length > 0) {
      const idx = visibleRouteSegments.findIndex((seg) => seg.floor === floorKey);
      if (idx !== -1) setSegmentIndex(idx);
    }
  };

  const routePointsForActiveFloor =
    visibleRouteSegments.find((seg) => seg.floor === activeFloor)?.points ?? null;

  return (
    <main className="home-page">
      {/* ヒーローセクション */}
      <section className="hero-banner">
        <h1 className="hero-main-title">愛知総合工科高校 文化祭</h1>
        <p className="hero-sub-title">校内マップ & 展示リアルタイム情報ガイド</p>
      </section>

      {/* スライドショー (空いている展示優先5部屋) - 仕様書 第5.1章・第5.2章 */}
      <Slideshow rooms={rooms} />

      {/* 展示一覧への誘導ボタン - 仕様書 第5.4章 */}
      <div className="rooms-list-cta-wrap">
        <Link to="/rooms" className="rooms-list-cta-btn">
          <span>📋</span> すべての展示・企画一覧を見る (混雑状況・ソート) →
        </Link>
      </div>

      {/* 教室検索 */}
      <SearchForm
        points={nodes}
        floorLabels={floorLabels}
        onSelectRoom={handleSelectRoom}
        onForceRoom={setForcedRoom}
      />

      {/* 経路検索 */}
      <RouteFinder
        mapData={mapData}
        onRouteComputed={handleRouteComputed}
        onClear={handleClearRoute}
      />

      {/* フロアセレクター */}
      <FloorSelector
        activeFloor={activeFloor}
        onChange={handleFloorChange}
        floorOrder={floorOrder}
        floorLabels={floorLabels}
        availableFloors={routeFloors}
      />

      {/* 校内マップ */}
      <section className="map-section">
        <div className="map-instruction-hint">
          💡 教室ピンをタップすると展示の詳細・現在の混雑状況を確認できます
        </div>

        <MapView
          points={nodes}
          zones={zones}
          activeFloor={activeFloor}
          highlightedId={highlightedId}
          onSelectRoom={handleSelectRoom}
          routePoints={routePointsForActiveFloor}
          forcedRoom={forcedRoom}
          onClearForcedRoom={() => setForcedRoom(null)}
        />
        <MapLegend />
        <div className="zoom-hint">ピンチ / ホイールで拡大・縮小できます</div>

        {visibleRouteSegments.length > 1 && (
          <div className="route-floor-nav">
            <button
              type="button"
              onClick={() => goToSegment(segmentIndex - 1)}
              disabled={segmentIndex === 0}
            >
              ← 前の階
            </button>
            <span className="step-label">
              {floorLabels[visibleRouteSegments[segmentIndex].floor]}{" "}
              ({segmentIndex + 1}/{visibleRouteSegments.length})
            </span>
            <button
              type="button"
              onClick={() => goToSegment(segmentIndex + 1)}
              disabled={segmentIndex === visibleRouteSegments.length - 1}
            >
              次の階 →
            </button>
          </div>
        )}
      </section>

      <RoomInfoModal
        room={selectedRoom}
        onClose={() => setSelectedRoom(null)}
      />
    </main>
  );
}
