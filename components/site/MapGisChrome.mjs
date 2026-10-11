'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { PageNavigation } from './PageNavigation.mjs'
import { MapIntroCard } from './FigmaHomeSidebarContent.mjs'

// Pixels of wheel that carry the map from the small planet to the last frame of the
// clip: the planet's growth is 2.4 / 2800 per pixel, the clip's progress 1 / 2800.
const ZOOM_PIXELS = 2800 + 2800 / 2.4
const ZOOM_STEPS = 1000

function readZoom(root) {
  if (!root) return 0
  const growth = Number(root.dataset.mapGrowth) || 0
  const progress = Number(root.dataset.mapProgress) || 0
  const mode = root.dataset.mapMode
  const pixels =
    mode === 'video' || mode === 'aligning'
      ? 2800 / 2.4 + progress * 2800
      : growth * (2800 / 2.4)
  return Math.min(1, Math.max(0, pixels / ZOOM_PIXELS))
}

function Icon({ children, label }) {
  return createElement(
    'svg',
    {
      className: 'map-gis-icon',
      viewBox: '0 0 24 24',
      width: 22,
      height: 22,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    children
  )
}

const ICONS = {
  reset: [
    createElement('path', { key: 'a', d: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5' }),
    createElement('path', { key: 'b', d: 'M4 4.5v4h4' }),
  ],
  satellite: [
    createElement('circle', { key: 'a', cx: 8, cy: 16, r: 3.2, fill: 'currentColor' }),
    createElement('path', { key: 'b', d: 'M10.4 13.8 20 5M11.5 15.2 21 11M9.4 11.7 14 3' }),
    createElement('path', { key: 'c', d: 'M9.8 19 19 17' }),
  ],
  lasso: [
    createElement('path', {
      key: 'a',
      d: 'M12 4c5 0 8.5 2 8.5 5s-3.5 5-8.5 5-8.5-2-8.5-5S7 4 12 4Z',
    }),
    createElement('path', { key: 'b', d: 'M9 13.6c-1 1.4-.3 3 1 3.4 1.8.5 2.6 1.5 1.8 3' }),
  ],
  info: [
    createElement('circle', { key: 'a', cx: 12, cy: 12, r: 8.5 }),
    createElement('path', { key: 'b', d: 'M12 11v5.5M12 7.6v.2' }),
  ],
}

function ToolButton({ label, icon, pressed, onClick, href, extraClass = '' }) {
  const props = {
    className: `map-gis-tool${pressed ? ' is-pressed' : ''}${extraClass ? ` ${extraClass}` : ''}`,
    'aria-label': label,
    title: label,
  }
  if (href) {
    return createElement('a', { ...props, href }, createElement(Icon, null, ICONS[icon]))
  }
  return createElement(
    'button',
    { ...props, type: 'button', 'aria-pressed': pressed, onClick },
    createElement(Icon, null, ICONS[icon])
  )
}

export function MapGisChrome({ homeHref = '/', cctvHref = '/experience/' }) {
  const [infoOpen, setInfoOpen] = useState(false)
  const [satelliteOn, setSatelliteOn] = useState(true)
  const [zoom, setZoom] = useState(0)
  const draggingRef = useRef(false)

  useEffect(() => {
    document.body.dataset.mapInfo = infoOpen ? 'open' : 'closed'
    return () => {
      delete document.body.dataset.mapInfo
    }
  }, [infoOpen])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (draggingRef.current) return
      setZoom(readZoom(document.querySelector('.figma-deep-zoom-map')))
    }, 120)
    return () => window.clearInterval(timer)
  }, [])

  const toggleSatellite = () => {
    const next = !satelliteOn
    setSatelliteOn(next)
    window.dispatchEvent(new CustomEvent('map:satellite', { detail: { on: next } }))
  }

  // The slider turns into the same wheel steps the mouse wheel would make, so the map's
  // own zoom (planet growth, then the clip) does the moving.
  const changeZoom = (event) => {
    const next = Number(event.target.value) / ZOOM_STEPS
    const root = document.querySelector('.figma-deep-zoom-map')
    if (!root) return
    const rect = root.getBoundingClientRect()
    const pixels = (next - zoom) * ZOOM_PIXELS
    setZoom(next)
    if (Math.abs(pixels) < 1) return
    root.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: pixels,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
        cancelable: true,
      })
    )
  }

  return createElement(
    'div',
    { className: 'map-gis-chrome' },
    createElement(
      'nav',
      { className: 'map-gis-toolbar', 'aria-label': '지도 도구' },
      createElement(
        'a',
        { className: 'map-gis-logo', href: homeHref, 'aria-label': 'mooeemee, 지도 처음으로' },
        createElement('span', null, 'moo'),
        createElement('span', null, 'eemee')
      ),
      createElement(ToolButton, {
        label: '시점 초기화',
        icon: 'reset',
        onClick: () => window.dispatchEvent(new CustomEvent('map:reset')),
      }),
      createElement(ToolButton, {
        label: satelliteOn ? '인공위성 끄기' : '인공위성 켜기',
        icon: 'satellite',
        pressed: satelliteOn,
        onClick: toggleSatellite,
      }),
      createElement(ToolButton, { label: 'CCTV 화면으로 이동', icon: 'lasso', href: cctvHref }),
      createElement(ToolButton, {
        label: '정보와 범례',
        icon: 'info',
        pressed: infoOpen,
        onClick: () => setInfoOpen((open) => !open),
      })
    ),
    createElement(
      'section',
      { className: `map-gis-info${infoOpen ? ' is-open' : ''}`, 'aria-label': '정보와 범례', hidden: !infoOpen },
      createElement(MapIntroCard),
      createElement(PageNavigation, { current: 'map' })
    ),
    createElement(
      'div',
      { className: 'map-gis-zoombar' },
      createElement('span', { className: 'map-gis-zoombar__end', 'aria-hidden': 'true' }),
      createElement('input', {
        className: 'map-gis-zoombar__range',
        type: 'range',
        min: 0,
        max: ZOOM_STEPS,
        step: 1,
        value: Math.round(zoom * ZOOM_STEPS),
        'aria-label': '지도 확대 정도',
        onChange: changeZoom,
        onPointerDown: () => {
          draggingRef.current = true
        },
        onPointerUp: () => {
          draggingRef.current = false
        },
        onPointerCancel: () => {
          draggingRef.current = false
        },
      }),
      createElement('span', { className: 'map-gis-zoombar__end', 'aria-hidden': 'true' })
    )
  )
}
