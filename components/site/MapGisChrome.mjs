'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { PageNavigation } from './PageNavigation.mjs'
import { MapIntroCard } from './FigmaHomeSidebarContent.mjs'
import { MapHeatTrail } from './MapHeatTrail.mjs'
import { MapLassoLayer, LASSO_DEFAULT_LEVEL, lassoPaletteAt } from './MapLassoLayer.mjs'

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
  undo: [
    createElement('path', { key: 'a', d: 'M9 7 4.5 11.5 9 16' }),
    createElement('path', { key: 'b', d: 'M5 11.5h9.5a4.5 4.5 0 0 1 0 9H11' }),
  ],
  trash: [
    createElement('path', { key: 'a', d: 'M5 7h14M10 4h4M7 7l.8 12.5h8.4L17 7' }),
    createElement('path', { key: 'b', d: 'M10.2 10.5v6M13.8 10.5v6' }),
  ],
  camera: [
    createElement('path', { key: 'a', d: 'M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4z' }),
    createElement('circle', { key: 'b', cx: 12, cy: 13.2, r: 3.2 }),
  ],
  info: [
    createElement('circle', { key: 'a', cx: 12, cy: 12, r: 8.5 }),
    createElement('path', { key: 'b', d: 'M12 11v5.5M12 7.6v.2' }),
  ],
}

// The colour scale of the lasso: drag the handle up or down to change the colour.
function LassoPanel() {
  const [level, setLevel] = useState(() =>
    typeof window !== 'undefined' && window.__mapLassoLevel != null ? window.__mapLassoLevel : LASSO_DEFAULT_LEVEL
  )
  const trackRef = useRef(null)
  const apply = (next) => {
    const clamped = Math.min(1, Math.max(0, next))
    setLevel(clamped)
    window.__mapLassoLevel = clamped
    window.dispatchEvent(new CustomEvent('map:lasso-level', { detail: { level: clamped } }))
  }
  const fromPointer = (event) => {
    const box = trackRef.current.getBoundingClientRect()
    apply(1 - (event.clientY - box.top) / box.height)
  }
  // The bar shows each palette as a short run of its colours, rim to core.
  const stops = []
  for (let i = 0; i <= 28; i += 1) {
    const palette = lassoPaletteAt(i / 28)
    stops.push(`rgb(${palette[2].map(Math.round).join(', ')}) ${Math.round((i / 28) * 100)}%`)
  }
  const gradient = `linear-gradient(to top, ${stops.join(', ')})`
  const stop = (k) => `rgb(${lassoPaletteAt(level)[k].map(Math.round).join(', ')})`
  const preview = `radial-gradient(circle at 42% 38%, ${stop(3)} 0%, ${stop(2)} 36%, ${stop(1)} 64%, ${stop(0)} 90%, transparent 100%)`
  return createElement(
    'div',
    { className: 'map-gis-lasso__panel' },
    createElement('span', { className: 'map-gis-lasso__preview', style: { background: preview }, 'aria-hidden': 'true' }),
    createElement(
    'div',
    {
      className: 'map-gis-scale',
      role: 'slider',
      tabIndex: 0,
      'aria-label': '올가미 색',
      'aria-orientation': 'vertical',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': Math.round(level * 100),
      onPointerDown: (event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId)
        fromPointer(event)
      },
      onPointerMove: (event) => {
        if (event.buttons) fromPointer(event)
      },
      onKeyDown: (event) => {
        if (event.key === 'ArrowUp') apply(level + 0.03)
        if (event.key === 'ArrowDown') apply(level - 0.03)
      },
    },
    createElement('span', { className: 'map-gis-scale__track', ref: trackRef, style: { background: gradient } }),
    createElement('span', {
      className: 'map-gis-scale__handle',
      style: { bottom: `${level * 100}%` },
    })
    )
  )
}

// The computer's camera, in the foot of the bar: a small mirrored picture of whoever is there.
// It only asks for the camera when the button is pressed, and lets go of it when pressed again.
function CameraTile() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const frameRef = useRef(0)
  const [state, setState] = useState('off') // off | on | denied

  // The picture is drawn small and blown up with no smoothing, so it comes out as a mosaic.
  const startMosaic = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const columns = 9
    const rows = 12
    const small = document.createElement('canvas')
    small.width = columns
    small.height = rows
    const smallContext = small.getContext('2d', { willReadFrequently: true })
    const context = canvas.getContext('2d')
    canvas.width = 80
    canvas.height = 104
    context.imageSmoothingEnabled = false
    const tick = () => {
      frameRef.current = window.requestAnimationFrame(tick)
      if (video.readyState < 2 || !video.videoWidth) return
      // cover the tile, taking the middle of the picture
      const aspect = columns / rows
      let sw = video.videoHeight * aspect
      let sh = video.videoHeight
      if (sw > video.videoWidth) {
        sw = video.videoWidth
        sh = sw / aspect
      }
      smallContext.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, columns, rows)
      context.drawImage(small, 0, 0, columns, rows, 0, 0, canvas.width, canvas.height)
    }
    frameRef.current = window.requestAnimationFrame(tick)
  }

  const stop = () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => stop, [])

  const toggle = async () => {
    if (state === 'on') {
      stop()
      setState('off')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 }, audio: false })
      streamRef.current = stream
      setState('on')
      // The video element exists once the state has changed.
      window.requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
          startMosaic()
        }
      })
    } catch {
      setState('denied')
    }
  }

  return createElement(
    'button',
    {
      type: 'button',
      className: `map-gis-camera${state === 'on' ? ' is-on' : ''}${state === 'denied' ? ' is-denied' : ''}`,
      'aria-label': state === 'on' ? '카메라 끄기' : state === 'denied' ? '카메라를 사용할 수 없습니다' : '카메라 켜기',
      title: state === 'denied' ? '카메라 권한이 없거나 카메라를 찾지 못했습니다' : state === 'on' ? '카메라 끄기' : '카메라 켜기',
      onClick: toggle,
    },
    state === 'on'
      ? [
          createElement('video', { key: 'v', ref: videoRef, className: 'map-gis-camera__source', muted: true, playsInline: true, autoPlay: true }),
          createElement('canvas', { key: 'c', ref: canvasRef, className: 'map-gis-camera__video' }),
        ]
      : createElement(Icon, null, ICONS.camera)
  )
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
  const [lassoOn, setLassoOn] = useState(false)
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

  // The chosen map style survives a reload.
  useEffect(() => {
    try {
      if (window.localStorage.getItem('map:color') === '1') setSatelliteOn(false)
    } catch {}
  }, [])

  const toggleSatellite = () => {
    const next = !satelliteOn
    setSatelliteOn(next)
    try {
      window.localStorage.setItem('map:color', next ? '0' : '1')
    } catch {}
    window.dispatchEvent(new CustomEvent('map:style', { detail: { on: !next } }))
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
        label: satelliteOn ? '색 지도 켜기' : '색 지도 끄기',
        icon: 'satellite',
        pressed: !satelliteOn,
        onClick: toggleSatellite,
      }),
      createElement(
        'div',
        { className: 'map-gis-lasso' },
        createElement(ToolButton, {
          label: lassoOn ? '올가미 도구 끄기' : '올가미 도구 켜기',
          icon: 'lasso',
          pressed: lassoOn,
          onClick: () => setLassoOn((on) => !on),
        }),
        lassoOn
          ? createElement(
              'div',
              { className: 'map-gis-lasso__bar', role: 'group', 'aria-label': '올가미 도구 옵션' },
              createElement(ToolButton, {
                label: '마지막 면 되돌리기',
                icon: 'undo',
                onClick: () => window.dispatchEvent(new CustomEvent('map:lasso-undo')),
              }),
              createElement(ToolButton, {
                label: '그린 면 모두 지우기',
                icon: 'trash',
                onClick: () => window.dispatchEvent(new CustomEvent('map:lasso-clear')),
              }),
            )
          : null,
        lassoOn ? createElement(LassoPanel) : null
      ),
      createElement(ToolButton, {
        label: '정보와 범례',
        icon: 'info',
        pressed: infoOpen,
        onClick: () => setInfoOpen((open) => !open),
      }),
      createElement(CameraTile)
    ),
    createElement(MapHeatTrail, { active: true }),
    createElement(MapLassoLayer, { active: lassoOn }),
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
