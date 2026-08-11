'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { getHouseVisitRadii } from '../../lib/house-visits.mjs'
import {
  HOUSE_MAP_POINTS,
  HOUSE_MAP_ZOOM_LEVELS,
  changeHouseMapZoom,
  clampHouseMapPan,
  getHouseMapLabelFontSize,
  getHouseMapRoutes,
  getHouseMapView,
} from '../../lib/house-map.mjs'

const SIDEBAR_MINUS_URL = assetPath('media/figma-sidebar-minus.svg')
const SIDEBAR_PLUS_URL = assetPath('media/figma-sidebar-plus.svg')
const MAP_VIEWBOX_WIDTH = 287
const MAP_VIEWBOX_HEIGHT = 180
const MAP_DRAG_THRESHOLD_PX = 5

function routeLabelPosition(route) {
  return {
    x: (route.from.x + route.to.x) / 2,
    y: (route.from.y + route.to.y) / 2 - 5,
  }
}

export function HouseMapCard({ distances = [], houseIndex = 0, visitCounts = {} }) {
  const [zoom, setZoom] = useState(HOUSE_MAP_ZOOM_LEVELS[0])
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef(null)
  const suppressClickRef = useRef(false)
  const routes = getHouseMapRoutes(distances, houseIndex)
  const selectedRoute = routes.find((route) => route.isSelected) ?? routes[0]
  const visitRadii = getHouseVisitRadii(visitCounts)
  const renderedPan = clampHouseMapPan(pan, houseIndex, zoom, visitRadii)
  const view = getHouseMapView(houseIndex, zoom, renderedPan, visitRadii)
  const labelFontSize = getHouseMapLabelFontSize(zoom)
  const canZoomOut = zoom > HOUSE_MAP_ZOOM_LEVELS[0]
  const canZoomIn = zoom < HOUSE_MAP_ZOOM_LEVELS.at(-1)
  const canPan = canZoomOut

  useEffect(() => {
    dragStateRef.current = null
    suppressClickRef.current = false
    setIsDragging(false)
    setPan({ x: 0, y: 0 })
  }, [houseIndex, zoom])

  const handlePointerDown = (event) => {
    if (!canPan || (event.pointerType === 'mouse' && event.button !== 0)) return

    const bounds = event.currentTarget.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: renderedPan.x,
      startPanY: renderedPan.y,
      unitScaleX: bounds.width > 0 ? MAP_VIEWBOX_WIDTH / bounds.width : 1,
      unitScaleY: bounds.height > 0 ? MAP_VIEWBOX_HEIGHT / bounds.height : 1,
      moved: false,
    }
    suppressClickRef.current = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current
    if (!canPan || !dragState || dragState.pointerId !== event.pointerId) return

    const screenDeltaX = event.clientX - dragState.startClientX
    const screenDeltaY = event.clientY - dragState.startClientY
    if (!dragState.moved && Math.hypot(screenDeltaX, screenDeltaY) < MAP_DRAG_THRESHOLD_PX) return

    dragState.moved = true
    suppressClickRef.current = true
    event.preventDefault()
    setIsDragging(true)
    setPan(
      clampHouseMapPan(
        {
          x: dragState.startPanX + screenDeltaX * dragState.unitScaleX,
          y: dragState.startPanY + screenDeltaY * dragState.unitScaleY,
        },
        houseIndex,
        zoom,
        visitRadii
      )
    )
  }

  const finishPointerGesture = (event) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStateRef.current = null
    setIsDragging(false)
  }

  const handleClickCapture = (event) => {
    if (!suppressClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

  return createElement(
    'section',
    {
      className: 'figma-sidebar-card figma-sidebar-network figma-house-map',
      'aria-label': '집 거리 지도',
      'data-map-zoom': zoom,
      'data-map-pan-x': renderedPan.x,
      'data-map-pan-y': renderedPan.y,
      'data-map-dragging': String(isDragging),
    },
    createElement(
      'svg',
      {
        className: `figma-house-map-canvas${canPan ? ' can-pan' : ''}${isDragging ? ' is-dragging' : ''}`,
        viewBox: '0 0 287 180',
        role: 'img',
        'aria-label': `${selectedRoute.from.id}에서 ${selectedRoute.to.id}, 거리 ${selectedRoute.distance}`,
        'data-map-pan-enabled': String(canPan),
        preserveAspectRatio: 'xMidYMid meet',
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: finishPointerGesture,
        onPointerCancel: finishPointerGesture,
        onLostPointerCapture: finishPointerGesture,
        onClickCapture: handleClickCapture,
      },
      createElement(
        'g',
        {
          className: 'figma-house-map-viewport',
          transform: view.transform,
        },
        ...routes.map((route) =>
          createElement('line', {
            className: `figma-house-map-route${route.isSelected ? ' is-selected' : ''}`,
            'data-map-route': route.id,
            x1: route.from.x,
            y1: route.from.y,
            x2: route.to.x,
            y2: route.to.y,
            key: `route-${route.id}`,
          })
        ),
        ...HOUSE_MAP_POINTS.map((house) =>
          createElement(
            'a',
            {
              className: 'figma-house-map-house-link',
              href: `${assetPath('experience')}/?house=${house.id}`,
              'data-map-house-link': house.id,
              'data-map-visit-count': Math.max(0, Number(visitCounts?.[house.id]) || 0),
              'aria-label': `${house.id} CCTV 보기, 최근 방문 ${Math.max(0, Number(visitCounts?.[house.id]) || 0)}회`,
              key: `house-link-${house.id}`,
            },
            createElement('circle', {
              className: 'figma-house-map-ring',
              cx: house.x,
              cy: house.y,
              r: visitRadii[house.id],
            }),
            createElement('circle', {
              className: 'figma-house-map-point',
              'data-map-house': house.id,
              cx: house.x,
              cy: house.y,
              r: 3,
            })
          )
        ),
        ...routes.map((route) => {
          const label = routeLabelPosition(route)

          return createElement(
            'text',
            {
              className: `figma-house-map-distance${route.isSelected ? ' is-selected' : ''}`,
              x: label.x,
              y: label.y,
              textAnchor: 'middle',
              style: { fontSize: `${labelFontSize}px` },
              key: `distance-${route.id}`,
            },
            String(route.distance)
          )
        })
      )
    ),
    createElement(
      'div',
      { className: 'figma-network-zoom', 'aria-label': `확대 비율 ${zoom}퍼센트` },
      createElement(
        'button',
        {
          type: 'button',
          className: 'figma-network-zoom-button',
          'aria-label': '지도 축소',
          disabled: !canZoomOut,
          onClick: () => setZoom((currentZoom) => changeHouseMapZoom(currentZoom, -1)),
        },
        createElement('img', {
          className: 'figma-network-zoom-icon figma-network-zoom-icon--minus',
          src: SIDEBAR_MINUS_URL,
          alt: '',
          draggable: false,
        })
      ),
      createElement('strong', { 'aria-live': 'polite' }, `${zoom}%`),
      createElement(
        'button',
        {
          type: 'button',
          className: 'figma-network-zoom-button',
          'aria-label': '지도 확대',
          disabled: !canZoomIn,
          onClick: () => setZoom((currentZoom) => changeHouseMapZoom(currentZoom, 1)),
        },
        createElement('img', {
          className: 'figma-network-zoom-icon figma-network-zoom-icon--plus',
          src: SIDEBAR_PLUS_URL,
          alt: '',
          draggable: false,
        })
      )
    )
  )
}
