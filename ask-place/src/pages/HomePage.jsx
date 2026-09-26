import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import mapData from "../data/campus_map_data.json";
import FloorSelector from "../components/FloorSelector.jsx";
import SearchForm from "../components/SearchForm.jsx";
import RouteFinder from "../components/RouteFinder.jsx";
import MapView, { MapLegend } from "../components/MapView.jsx";
import RoomInfoModal from "../components/RoomInfoModal.jsx";
import { useRooms } from "../context/RoomsContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import ImageSlider from "../components/imageSlide.jsx";

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
  const { isPublished } = useSiteSettings();
  const { rooms } = useRooms();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [activeFloor, setActiveFloor] = useState(floorOrder[0]);
  const [highlightedId, setHighlightedId] = useState(null);
  const [routeSegments, setRouteSegments] = useState([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [forcedRoom, setForcedRoom] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [routeEndpointIds, setRouteEndpointIds] = useState(new Set());

  // 部屋検索・経路検索・詳細画面遷移などから指定されたノードID/名前のSet（非公開でも表示・強調する用）
  const [extraVisibleNodeIds, setExtraVisibleNodeIds] = useState(new Set());

  const visibleRouteSegments = getVisibleRouteSegments(routeSegments);
  const routeFloors =
    visibleRouteSegments.length > 0
      ? visibleRouteSegments.map((seg) => seg.floor)
      : null;

  // 公開中 (enabled == true) の部屋識別子セット
  const publishedRoomIds = useMemo(() => {
    const set = new Set();
    rooms.forEach((r) => {
      if (r.id) set.add(r.id);
      if (r.roomName) set.add(r.roomName);
    });
    return set;
  }, [rooms]);

  // マップに表示するノードの決定
  // 1. type !== 'room'（入口・階段等）は常時表示
  // 2. 検索・経路・詳細遷移で指定された部屋ノードは表示
  // 3. デフォルトは「公開中の部屋」のroomノードのみ表示
  const visiblePoints = useMemo(() => {
    return nodes.filter((p) => {
      if (p.type !== "room") return true;
      if (
        extraVisibleNodeIds.has(p.id) ||
        extraVisibleNodeIds.has(p.name) ||
        routeEndpointIds.has(p.id) ||
        routeEndpointIds.has(p.name)
      ) {
        return true;
      }
      return publishedRoomIds.has(p.name) || publishedRoomIds.has(p.id);
    });
  }, [publishedRoomIds, extraVisibleNodeIds, routeEndpointIds]);

  // 詳細画面（校内マップで場所を確認ボタン）からの遷移処理
  const targetRoomParam = searchParams.get("room") || location.state?.targetRoomId;
  useEffect(() => {
    if (!targetRoomParam) return;

    const targetNode = nodes.find(
      (n) => n.name === targetRoomParam || n.id === targetRoomParam
    );

    if (targetNode) {
      // 1. その部屋のフロアに切り替え
      setActiveFloor(targetNode.floor);
      // 2. 表示対象に追加
      setExtraVisibleNodeIds((prev) => new Set([...prev, targetNode.id, targetNode.name]));
      // 3. 赤い丸を描画して強調表示
      setHighlightedId(targetNode.id);

      // 4. マップまでスクロール
      setTimeout(() => {
        const mapSection = document.querySelector(".map-section");
        if (mapSection) {
          mapSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [targetRoomParam]);

  // マップ上のピンを直接タップした時
  const handleSelectRoom = (point) => {
    setHighlightedId(point.id);
    if (point.type === "room") {
      setSelectedRoom(point);
      return;
    }

    if (point.floor !== activeFloor) {
      setActiveFloor(point.floor);
    }
  };

  // 教室検索から部屋を選択した時
  const handleSelectRoomFromSearch = (point) => {
    // 1. その部屋のフロアへ切り替え
    if (point.floor !== activeFloor) {
      setActiveFloor(point.floor);
    }
    // 2. roomノードを表示対象に追加
    setExtraVisibleNodeIds((prev) => new Set([...prev, point.id, point.name]));
    // 3. 赤い丸で強調表示
    setHighlightedId(point.id);
    // 4. 部屋モーダルを表示
    if (point.type === "room") {
      setSelectedRoom(point);
    }
  };

  // 経路検索実行時
  const handleRouteComputed = (segments, meta) => {
    setRouteSegments(segments);
    setSegmentIndex(0);
    const visibleSegments = getVisibleRouteSegments(segments);
    if (visibleSegments.length > 0) {
      setActiveFloor(visibleSegments[0].floor);
    } else if (segments.length > 0) {
      setActiveFloor(segments[0].floor);
    }

    const endpointIds = [];
    const highlightIds = [];

    if (meta?.startId) {
      endpointIds.push(meta.startId);
      highlightIds.push(meta.startId);
    }
    if (meta?.endId) {
      endpointIds.push(meta.endId);
      highlightIds.push(meta.endId);
    }

    // 非公開の出発地・目的地だけを一時表示し、中間ノードは経路線で示す。
    setExtraVisibleNodeIds(new Set());
    setRouteEndpointIds(new Set(endpointIds));
    if (highlightIds.length > 0) {
      setHighlightedId(highlightIds);
    }
  };

  const handleClearRoute = () => {
    setRouteSegments([]);
    setSegmentIndex(0);
    setHighlightedId(null);
    setRouteEndpointIds(new Set());
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

  // サイト非公開（準備中）時の表示
  if (!isPublished) {
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
          <div className="maintenance-actions">
            <Link to="/admin" className="maintenance-admin-btn">
              管理者ログイン
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="home-page">
      <ImageSlider />

      {/* 展示一覧への誘導ボタン */}
      <div className="rooms-list-cta-wrap">
        <Link to="/rooms" className="rooms-list-cta-btn">
          すべての展示・企画一覧を見る
        </Link>
      </div>

      {/* 教室検索（全教室ノードから検索可能） */}
      <SearchForm
        points={nodes}
        floorLabels={floorLabels}
        onSelectRoom={handleSelectRoomFromSearch}
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
          教室ピンをタップすると展示の詳細・現在の混雑状況を確認できます
        </div>

        <MapView
          points={visiblePoints}
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
