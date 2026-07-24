import { useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

import f1 from '../map/F1.png'
import f2 from '../map/F2.png'
import f3 from '../map/F3.png'
import f4 from '../map/F4.png'
import f5 from '../map/F5.png'

const FLOOR_IMAGES = {
  floor_1F: f1,
  floor_2F: f2,
  floor_3F: f3,
  floor_4F: f4,
  floor_5F: f5,
}

const PIN_TYPES = ['room', 'stamp', 'branch', 'entrance', 'stairs']

export default function MapView({ points, activeFloor, highlightedId, onSelectRoom, routePoints }) {
  const containerRef = useRef(null)
  const [naturalSize, setNaturalSize] = useState(null)
  const [fitScale, setFitScale] = useState(1)

  const src = FLOOR_IMAGES[activeFloor]

  useEffect(() => {
    setNaturalSize(null)
    const img = new Image()
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
      const containerW = containerRef.current?.clientWidth || img.naturalWidth
      const scale = Math.min(containerW / img.naturalWidth, 1.6)
      setFitScale(scale > 0 ? scale : 1)
    }
    img.src = src
  }, [src])

  const floorPoints = points.filter((p) => p.floor === activeFloor)

  const frameStyle = naturalSize
    ? { aspectRatio: `${naturalSize.w} / ${naturalSize.h}` }
    : { aspectRatio: '4 / 3' }

  return (
    <div className="map-frame" style={frameStyle} ref={containerRef}>
      <span className="crop tl" />
      <span className="crop tr" />
      <span className="crop bl" />
      <span className="crop br" />
      <div className="map-canvas-wrap">
        {naturalSize && (
          <TransformWrapper
            key={activeFloor}
            initialScale={fitScale}
            minScale={fitScale}
            maxScale={fitScale * 4}
            centerOnInit
            centerZoomedOut
            limitToBounds
            wheel={{ step: 0.15 }}
            doubleClick={{ mode: 'zoomIn' }}
          >
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <div
                className="map-image-layer"
                style={{ width: naturalSize.w, height: naturalSize.h }}
              >
                <img src={src} alt={`${activeFloor} フロアマップ`} draggable={false} />
                {routePoints && routePoints.length > 1 && (
                  <svg
                    className="route-overlay"
                    width={naturalSize.w}
                    height={naturalSize.h}
                    viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
                  >
                    <polyline
                      points={routePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      className="route-line"
                    />
                    {routePoints.map((p, i) => (
                      <circle
                        key={p.nodeId}
                        cx={p.x}
                        cy={p.y}
                        r={i === 0 || i === routePoints.length - 1 ? 7 : 4}
                        className={
                          i === 0
                            ? 'route-node start'
                            : i === routePoints.length - 1
                              ? 'route-node end'
                              : 'route-node'
                        }
                      />
                    ))}
                  </svg>
                )}
                {floorPoints.map((p) => {
                  const clickable = p.type === 'room' || p.type === 'stamp'
                  return (
                    <div
                      key={p.id}
                      className={`map-pin type-${p.type}${highlightedId === p.id ? ' highlighted' : ''}`}
                      style={{ left: p.x, top: p.y }}
                      onClick={clickable ? () => onSelectRoom(p) : undefined}
                      role={clickable ? 'button' : undefined}
                      aria-label={clickable ? p.name : undefined}
                    />
                  )
                })}
              </div>
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>
    </div>
  )
}

export function MapLegend() {
  const labels = {
    room: '教室',
    stamp: 'スタンプ対象',
    branch: '分岐点',
    entrance: '入口',
    stairs: '階段 / EV',
  }
  return (
    <div className="map-legend">
      {PIN_TYPES.map((t) => (
        <span key={t}>
          <i className={`map-pin type-${t}`} style={{ position: 'static', transform: 'none' }} />
          {labels[t]}
        </span>
      ))}
    </div>
  )
}
