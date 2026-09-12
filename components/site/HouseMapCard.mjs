'use client'

import { createElement, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { getHouseVisitRadii } from '../../lib/house-visits.mjs'
import {
  HOUSE_MAP_POINTS,
  HOUSE_MAP_ZOOM_LEVELS,
  changeHouseMapZoom,
  changeHouseMapZoomByWheel,
  getHouseMapLabelFontSize,
  getHouseMapRoutes,
  getHouseMapView,
} from '../../lib/house-map.mjs'

const SIDEBAR_MINUS_URL = assetPath('media/figma-sidebar-minus.svg')
const SIDEBAR_PLUS_URL = assetPath('media/figma-sidebar-plus.svg')
const MAP_VIEWBOX_WIDTH = 287
const MAP_VIEWBOX_HEIGHT = 180

function clampUnit(value) {
  return Math.max(0, Math.min(1, value))
}

function getLayerOpacities(zoom) {
  return {
    overview: clampUnit((64 - zoom) / 38),
    detail: clampUnit((zoom - 25) / 40),
  }
}

function routeLabelPosition(route) {
  return {
    x: (route.from.x + route.to.x) / 2,
    y: (route.from.y + route.to.y) / 2 - 5,
  }
}

function renderOverviewLayer() {
  return createElement(
    'g',
    { className: 'figma-island-overview', 'aria-hidden': true },
    createElement('path', {
      className: 'figma-island-silhouette',
      d: 'M18 20H93V35H117V54H105V76H132V64H154V48H178V56H202V81H218V104H204V125H179V147H143V161H101V149H72V132H50V108H35V77H18Z',
    }),
    createElement('path', {
      className: 'figma-island-silhouette figma-island-silhouette--shore',
      d: 'M229 122H250V137H270V157H247V168H226V150H215V133Z',
    }),
    ...Array.from({ length: 13 }, (_, row) =>
      createElement(
        'text',
        { className: 'figma-island-glyph-row', x: 28 + (row % 3) * 5, y: 35 + row * 8.5, key: `overview-row-${row}` },
        '✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦✦'
      )
    )
  )
}

function renderDetailLayer() {
  const currents = [
    [26, 42, 43, 35], [49, 65, 60, 51], [75, 36, 91, 43], [104, 66, 112, 52],
    [200, 31, 218, 42], [226, 54, 240, 40], [247, 89, 264, 80], [213, 116, 231, 129],
    [47, 119, 58, 108], [82, 139, 99, 131], [115, 150, 130, 136], [151, 107, 166, 97],
  ]

  return createElement(
    'g',
    { className: 'figma-island-detail', 'aria-hidden': true },
    createElement('path', { className: 'figma-island-road', d: 'M-15 125C38 103 63 97 112 80C143 69 160 61 212 60C237 59 263 68 303 77' }),
    createElement('path', { className: 'figma-island-road figma-island-road--thin', d: 'M77 -6C102 25 120 54 136 85C150 111 176 135 219 191' }),
    createElement('path', { className: 'figma-island-contour', d: 'M20 28C65 5 99 21 94 54C89 85 44 96 23 79C1 61 1 40 20 28Z' }),
    createElement('path', { className: 'figma-island-contour', d: 'M109 16C141 -1 182 8 197 31C211 53 190 81 160 81C128 81 105 54 109 16Z' }),
    createElement('path', { className: 'figma-island-contour', d: 'M200 89C238 72 273 92 270 124C267 156 220 171 196 146C175 125 180 99 200 89Z' }),
    createElement('path', { className: 'figma-island-terrain', d: 'M7 118C44 98 71 109 90 135C109 161 142 178 175 187H-2Z' }),
    ...currents.map(([x1, y1, x2, y2], index) => createElement('line', { className: 'figma-island-current', x1, y1, x2, y2, key: `current-${index}` })),
    createElement('text', { className: 'figma-island-coordinate figma-island-coordinate--top', x: 12, y: 12 }, '09.0100° N, 21.8000° E'),
    createElement('text', { className: 'figma-island-scale', x: 62, y: 21 }, '500 m       400 m       300 m       200 m       100 m'),
    createElement('text', { className: 'figma-island-north', x: 134, y: 130 }, 'N')
  )
}

function renderHouseShape(house) {
  const shapes = {
    house1: 'M-6 -6H3V-2H7V7H-4V3H-6Z', house2: 'M-7 -7H6V-2H9V7H-5V3H-7Z',
    house3: 'M-6 -7H7V5H3V8H-6Z', house4: 'M-5 -5H6V6H-5Z',
  }
  const rotations = { house1: -14, house2: 16, house3: 30, house4: -22 }
  return createElement('path', { className: 'figma-island-building', d: shapes[house.id], transform: `translate(${house.x} ${house.y}) rotate(${rotations[house.id]})` })
}

export function HouseMapCard({ distances = [], houseIndex = 0, visitCounts = {} }) {
  const [zoom, setZoom] = useState(HOUSE_MAP_ZOOM_LEVELS[0])
  const routes = getHouseMapRoutes(distances, houseIndex)
  const selectedRoute = routes.find((route) => route.isSelected) ?? routes[0]
  const visitRadii = getHouseVisitRadii(visitCounts)
  const view = getHouseMapView(zoom)
  const labelFontSize = getHouseMapLabelFontSize(zoom)
  const canZoomOut = zoom > HOUSE_MAP_ZOOM_LEVELS[0]
  const canZoomIn = zoom < 100
  const opacity = getLayerOpacities(zoom)

  const handleWheel = (event) => {
    const nextZoom = changeHouseMapZoomByWheel(zoom, event.deltaY)
    if (nextZoom === zoom) return
    event.preventDefault()
    setZoom(nextZoom)
  }

  return createElement(
    'section',
    { className: 'figma-sidebar-card figma-sidebar-network figma-house-map', 'aria-label': '집 위치 지도', 'data-map-zoom': zoom, style: { '--map-overview-opacity': opacity.overview, '--map-detail-opacity': opacity.detail } },
    createElement(
      'svg',
      { className: 'figma-house-map-canvas', viewBox: `0 0 ${MAP_VIEWBOX_WIDTH} ${MAP_VIEWBOX_HEIGHT}`, role: 'img', 'aria-label': `${selectedRoute.from.id}에서 ${selectedRoute.to.id}, 거리 ${selectedRoute.distance}`, preserveAspectRatio: 'xMidYMid meet', onWheel: handleWheel },
      createElement(
        'g',
        { className: 'figma-house-map-viewport', transform: view.transform },
        renderOverviewLayer(),
        renderDetailLayer(),
        createElement(
          'g',
          { className: 'figma-island-houses', style: { opacity: opacity.detail, pointerEvents: opacity.detail > 0.25 ? 'auto' : 'none' } },
          ...routes.map((route) => createElement('line', { className: `figma-house-map-route${route.isSelected ? ' is-selected' : ''}`, 'data-map-route': route.id, x1: route.from.x, y1: route.from.y, x2: route.to.x, y2: route.to.y, key: `route-${route.id}` })),
          ...HOUSE_MAP_POINTS.map((house) => createElement(
            'a',
            { className: 'figma-house-map-house-link', href: `${assetPath('experience')}/?house=${house.id}`, 'data-map-house-link': house.id, 'data-map-visit-count': Math.max(0, Number(visitCounts?.[house.id]) || 0), 'aria-label': `${house.id} CCTV 보기, 최근 방문 ${Math.max(0, Number(visitCounts?.[house.id]) || 0)}회`, key: `house-link-${house.id}` },
            createElement('circle', { className: 'figma-house-map-ring', cx: house.x, cy: house.y, r: visitRadii[house.id] }),
            renderHouseShape(house)
          )),
          ...routes.map((route) => {
            const label = routeLabelPosition(route)
            return createElement('text', { className: `figma-house-map-distance${route.isSelected ? ' is-selected' : ''}`, x: label.x, y: label.y, textAnchor: 'middle', style: { fontSize: `${labelFontSize}px` }, key: `distance-${route.id}` }, String(route.distance))
          })
        )
      )
    ),
    createElement(
      'div',
      { className: 'figma-network-zoom', 'aria-label': `확대 비율 ${zoom}퍼센트` },
      createElement('button', { type: 'button', className: 'figma-network-zoom-button', 'aria-label': '지도 축소', disabled: !canZoomOut, onClick: () => setZoom((currentZoom) => changeHouseMapZoom(currentZoom, -1)) }, createElement('img', { className: 'figma-network-zoom-icon figma-network-zoom-icon--minus', src: SIDEBAR_MINUS_URL, alt: '', draggable: false })),
      createElement('strong', { 'aria-live': 'polite' }, `${zoom}%`),
      createElement('button', { type: 'button', className: 'figma-network-zoom-button', 'aria-label': '지도 확대', disabled: !canZoomIn, onClick: () => setZoom((currentZoom) => changeHouseMapZoom(currentZoom, 1)) }, createElement('img', { className: 'figma-network-zoom-icon figma-network-zoom-icon--plus', src: SIDEBAR_PLUS_URL, alt: '', draggable: false }))
    )
  )
}
