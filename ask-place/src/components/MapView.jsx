import { useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { getActivityForRoom, isRoomVisible, activityData } from '../utils/activities.js'

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

export default function MapView({ points, zones = [], activeFloor, highlightedId, onSelectRoom, routePoints }) {
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

  const floorPoints = points.filter(
    (p) =>
      p.floor === activeFloor &&
      p.type !== 'branch' &&
      (p.type !== 'room' || isRoomVisible(p.name)),
  )
  const floorZones = zones.filter((z) => z.floor === activeFloor)

  const frameStyle = naturalSize
    ? { aspectRatio: `${naturalSize.w} / ${naturalSize.h}` }
    : { aspectRatio: '4 / 3' }

  return (
    <div className="map-frame" style={frameStyle} ref={containerRef}>
      <div className="map-canvas-wrap">
        {naturalSize && (
          <TransformWrapper
            key={activeFloor}
            initialScale={fitScale}
            minScale={fitScale}
            maxScale={fitScale * 4}

            limitToBounds={true}

            panning={{
              velocityDisabled: true
            }}
          >
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
            >
              <div
                className="map-image-layer"
                style={{ width: naturalSize.w, height: naturalSize.h }}
              >
                <img src={src} alt={`${activeFloor} フロアマップ`} draggable={false} />
                {floorZones.length > 0 && (
                  <svg
                    className="zone-overlay"
                    width={naturalSize.w}
                    height={naturalSize.h}
                    viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
                  >
                    {floorZones.map((z) => (
                      <g key={z.id}>
                        <polygon
                          points={z.points.map((p) => `${p.x},${p.y}`).join(' ')}
                          className="zone-polygon"
                        />
                        {z.label && (
                          <text
                            x={z.points.reduce((s, p) => s + p.x, 0) / z.points.length}
                            y={z.points.reduce((s, p) => s + p.y, 0) / z.points.length}
                            className="zone-label"
                            textAnchor="middle"
                          >
                            {z.label}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                )}
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
                  const activity = p.type === 'room' ? getActivityForRoom(p.name) : null
                  const pinStyle = {
                    left: p.x,
                    top: p.y,
                    ...(activity ? { background: activity.color } : {}),
                  }
                  return (
                    <div
                      key={p.id}
                      className={`map-pin type-${p.type}${highlightedId === p.id ? ' highlighted' : ''}`}
                      style={pinStyle}
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
  const otherLabels = {
    entrance: '入口',
    stairs: '階段 / EV',
  }
  return (
    <div className="map-legend">
      {activityData.map((act) => (
        <span key={act.id}>
          <i style={{ background: act.color, width: 9, height: 9, borderRadius: '50%', display: 'inline-block' }} />
          {act.name}
        </span>
      ))}
      {Object.entries(otherLabels).map(([t, label]) => (
        <span key={t}>
          <i className={`map-pin type-${t}`} style={{ position: 'static', transform: 'none' }} />
          {label}
        </span>
      ))}
    </div>
  )
}
