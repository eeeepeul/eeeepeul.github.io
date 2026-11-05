'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { MapZoomSlider } from './MapZoomSlider.mjs'

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
  // two arrows head to head along the diagonal: the zoom bar
  expand: [
    createElement('path', { key: 'a', d: 'M4 10V4h6' }),
    createElement('path', { key: 'b', d: 'M4 4l16 16' }),
    createElement('path', { key: 'c', d: 'M20 14v6h-6' }),
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

export function MapGisChrome({ homeHref = '/' }) {
  const [infoOpen, setInfoOpen] = useState(false)
  const [folded, setFolded] = useState(false)
  // whether the zoom bar (the second button) is out
  const [zoomOpen, setZoomOpen] = useState(false)
  // Where the bar has been dragged to, in cqw from the map box's top left (null: where it starts).
  const [place, setPlace] = useState(null)
  const barRef = useRef(null)
  const drag = useRef(null)

  const startDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    if (event.target.closest('button')) return
    const bar = barRef.current
    const box = bar?.offsetParent
    const stage = bar?.closest('.stage')
    if (!bar || !box || !stage) return
    const barRect = bar.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()
    drag.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: barRect.left - boxRect.left,
      top: barRect.top - boxRect.top,
      maxLeft: boxRect.width - barRect.width,
      maxTop: boxRect.height - barRect.height,
      unit: 100 / stage.getBoundingClientRect().width,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // a synthetic pointer cannot be captured; the drag still follows the pointer events
    }
    event.preventDefault()
  }
  const moveDrag = (event) => {
    const d = drag.current
    if (!d || d.pointer !== event.pointerId) return
    const left = Math.max(0, Math.min(d.maxLeft, d.left + event.clientX - d.startX))
    const top = Math.max(0, Math.min(d.maxTop, d.top + event.clientY - d.startY))
    setPlace({ x: left * d.unit, y: top * d.unit })
  }
  const endDrag = (event) => {
    if (drag.current && drag.current.pointer === event.pointerId) drag.current = null
  }

  // The info button opens the guide that lies over the whole stage (StageGuide). It only asks for
  // it; the guide says back whether it is open, so the button can show that it is pressed.
  useEffect(() => {
    const onState = (event) => setInfoOpen(Boolean(event.detail?.open))
    window.addEventListener('stage:guide-state', onState)
    return () => window.removeEventListener('stage:guide-state', onState)
  }, [])

  return createElement(
    'div',
    { className: 'map-gis-chrome' },
    createElement(
      'nav',
      {
        ref: barRef,
        className: `map-gis-toolbar${folded ? ' is-folded' : ''}`,
        'aria-label': '지도 도구',
        style: place ? { left: `${place.x}cqw`, top: `${place.y}cqw` } : undefined,
      },
      // the bar's head, with the button that folds it away
      createElement(
        'div',
        {
          className: 'map-gis-bar__head',
          title: '끌어서 옮기기',
          onPointerDown: startDrag,
          onPointerMove: moveDrag,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        },
        createElement(
          'button',
          {
            className: 'map-gis-bar__fold',
            type: 'button',
            'aria-label': folded ? '도구 펼치기' : '도구 접기',
            'aria-expanded': !folded,
            onClick: () => setFolded((value) => !value),
          },
          createElement('span', { className: 'map-gis-bar__dash', 'aria-hidden': 'true' })
        )
      ),
      folded
        ? null
        : createElement(
            'div',
            { className: 'map-gis-bar__body' },
            createElement(
              'a',
              { className: 'map-gis-logo', href: homeHref, 'aria-label': 'mooeemee, 지도 처음으로' },
              createElement('img', { src: assetPath('media/map-toolbar-logo.png'), alt: 'mooeemee', draggable: false })
            ),
            createElement(ToolButton, {
              label: '시점 초기화',
              icon: 'reset',
              onClick: () => window.dispatchEvent(new CustomEvent('map:reset')),
            }),
            createElement(ToolButton, {
              label: zoomOpen ? '확대 축소 바 닫기' : '확대 축소 바 열기',
              icon: 'expand',
              pressed: zoomOpen,
              onClick: () => setZoomOpen((open) => !open),
            }),
            createElement(ToolButton, {
              label: '정보와 범례',
              icon: 'info',
              pressed: infoOpen,
              onClick: () => window.dispatchEvent(new CustomEvent('stage:guide', { detail: { toggle: true } })),
            }),
          )
    ),
    zoomOpen ? createElement(MapZoomSlider) : null
  )
}
