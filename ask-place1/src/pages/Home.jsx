import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import mapData from '../data/campus_map_data.json'
import FloorSelector from '../components/FloorSelector.jsx'
import SearchForm from '../components/SearchForm.jsx'
import RouteFinder from '../components/RouteFinder.jsx'
import MapView, { MapLegend } from '../components/MapView.jsx'
import RoomInfoModal from '../components/RoomInfoModal.jsx'
import HomeImg from "../../public/image.png"

const { nodes, zones, floorOrder, floorLabels } = mapData

export default function Home() {
  const [activeFloor, setActiveFloor] = useState(floorOrder[0])
  const [highlightedId, setHighlightedId] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [routeSegments, setRouteSegments] = useState([])
  const [segmentIndex, setSegmentIndex] = useState(0)

  // 経路検索中は、その経路が実際に通る階だけをフロア切替に表示する
  const routeFloors = routeSegments.length > 0 ? routeSegments.map((seg) => seg.floor) : null

  const handleSelectRoom = (room) => {
    // 教室を新しく検索・選択したら経路表示はクリアする(全フロア表示に戻す)
    setRouteSegments([])
    setSegmentIndex(0)
    if (room.floor !== activeFloor) setActiveFloor(room.floor)
    setHighlightedId(room.id)
    setSelectedRoom(room)
  }

  const handleRouteComputed = (segments) => {
    setRouteSegments(segments)
    setSegmentIndex(0)
    if (segments.length > 0) setActiveFloor(segments[0].floor)
  }

  const handleClearRoute = () => {
    setRouteSegments([])
    setSegmentIndex(0)
  }

  const goToSegment = (index) => {
    if (index < 0 || index >= routeSegments.length) return
    setSegmentIndex(index)
    setActiveFloor(routeSegments[index].floor)
  }

  const handleFloorChange = (floorKey) => {
    setActiveFloor(floorKey)
    if (routeSegments.length > 0) {
      const idx = routeSegments.findIndex((seg) => seg.floor === floorKey)
      if (idx !== -1) setSegmentIndex(idx)
    }
  }

  const routePointsForActiveFloor =
    routeSegments.find((seg) => seg.floor === activeFloor)?.points ?? null

  return (
    <>
        <div className='TitleContent'>
          <img src={HomeImg} alt="" className='HomeImg' />
          <h1 className='title'>Welcome to ASK!</h1>
        </div>
      <section className="hero">
        <h2 className="hero-title">ようこそ、学校説明会へ</h2>
        <p className="hero-sub">
          校内マップで教室の場所を確認できます。気になる教室を検索するか、マップ上のマーカーをタップしてください。
        </p>
      </section>

      <SearchForm points={nodes} floorLabels={floorLabels} onSelectRoom={handleSelectRoom} />

      <RouteFinder
        mapData={mapData}
        onRouteComputed={handleRouteComputed}
        onClear={handleClearRoute}
      />

      <FloorSelector
        activeFloor={activeFloor}
        onChange={handleFloorChange}
        floorOrder={floorOrder}
        floorLabels={floorLabels}
        availableFloors={routeFloors}
      />

      <section className="map-section">
        <MapView
          points={nodes}
          zones={zones}
          activeFloor={activeFloor}
          highlightedId={highlightedId}
          onSelectRoom={handleSelectRoom}
          routePoints={routePointsForActiveFloor}
        />
        <MapLegend />
        <div className="zoom-hint">ピンチ / ホイールで拡大・縮小できます</div>

        {routeSegments.length > 1 && (
          <div className="route-floor-nav">
            <button
              type="button"
              onClick={() => goToSegment(segmentIndex - 1)}
              disabled={segmentIndex === 0}
            >
              ← 前の階
            </button>
            <span className="step-label">
              {floorLabels[routeSegments[segmentIndex].floor]}
              {' '}({segmentIndex + 1}/{routeSegments.length})
            </span>
            <button
              type="button"
              onClick={() => goToSegment(segmentIndex + 1)}
              disabled={segmentIndex === routeSegments.length - 1}
            >
              次の階 →
            </button>
          </div>
        )}
      </section>

      <RoomInfoModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />

    </>
  )
}
