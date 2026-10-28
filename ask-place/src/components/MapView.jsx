import { useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

import f1 from '../data/1F-vector-combined.svg'
import f2 from '../data/2F-vector-combined.svg'
import f3 from '../data/3F-vector-combined.svg'
import f4 from '../data/4F-vector-combined.svg'
import f5 from '../data/5F-vector-combined.svg'

const FLOOR_IMAGES = {
  floor_1F: f1,
  floor_2F: f2,
  floor_3F: f3,
  floor_4F: f4,
  floor_5F: f5,
}

// Map points use each floor SVG's viewBox coordinate system.
const FLOOR_SIZES = {
  floor_1F: { w: 1957, h: 1264 },
  floor_2F: { w: 1968, h: 1296 },
  floor_3F: { w: 1976, h: 1290 },
  floor_4F: { w: 1973, h: 1290 },
  floor_5F: { w: 1968, h: 221 },
}

export default function MapView({ points, zones = [], activeFloor, highlightedId, onSelectRoom, routePoints, forcedRoom,onClearForcedRoom,  }) {
  const containerRef = useRef(null)
  const [naturalSize, setNaturalSize] = useState(null)
  const [fitScale, setFitScale] = useState(1)

  const src = FLOOR_IMAGES[activeFloor]

  useEffect(() => {
    const size = FLOOR_SIZES[activeFloor]
    setNaturalSize(size)
    const containerW = containerRef.current?.clientWidth || size.w
    const scale = Math.min(containerW / size.w, 1.6)
    setFitScale(scale > 0 ? scale : 1)
  }, [activeFloor, src])

  const floorPoints = points.filter(
    (p) =>
      p.floor === activeFloor &&
      p.type !== 'branch',
  );
  const floorZones = zones.filter((z) => z.floor === activeFloor)
  const floorRoutePoints = (routePoints || []).filter((point) => point.floor === activeFloor)

  const frameStyle = naturalSize
    ? { aspectRatio: `${naturalSize.w} / ${naturalSize.h}` }
    : { aspectRatio: '4 / 3' }

  return (
    <div className="map-frame" style={frameStyle} ref={containerRef}>
      <div className="map-canvas-wrap">
        {naturalSize && (
          <TransformWrapper
            key={`${activeFloor}-${naturalSize.w}-${naturalSize.h}-${fitScale}`}
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
                <img src={src} alt={`${activeFloor} フロアマップ`} width={naturalSize.w} height={naturalSize.h} draggable={false} />
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
                            立入禁止
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                )}
                {floorRoutePoints.length > 1 && (
                  <svg
                    className="route-overlay"
                    width={naturalSize.w}
                    height={naturalSize.h}
                    viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
                  >
                    <polyline
                      points={floorRoutePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      className="route-line"
                    />
                    {floorRoutePoints.map((p, i) => (
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
                  const clickable = p.type === 'room' || p.type === 'entrance'
                  const pinStyle = {
                    left: p.x,
                    top: p.y,
                  }
                  const isHighlighted = Array.isArray(highlightedId)
                    ? highlightedId.includes(p.id) || highlightedId.includes(p.name)
                    : highlightedId === p.id || highlightedId === p.name
                  return (
                    <div
                      key={p.id}
                      className={`map-pin type-${p.type}${isHighlighted ? ' highlighted' : ''}`}
                      style={pinStyle}
                      onClick={
                        clickable
                          ? () => {
                            onClearForcedRoom?.();
                            onSelectRoom(p);
                          }
                          : undefined
                      }
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
    room: '部屋',
    exhibit: '展示',
    entrance: '受付',
    stairs: '階段 / EV',
    toilet: 'トイレ',
  }
  return (
    <div className="map-legend">
      {Object.entries(otherLabels).map(([t, label]) => (
        <span key={t}>
          <i className={`map-pin type-${t}`} style={{ position: 'static', transform: 'none', width: '20px', height:'20px' }} />
          {label}
        </span>
      ))}
    </div>
  )
}
