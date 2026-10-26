'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { PageNavigation } from './PageNavigation.mjs'
import { MapIntroCard } from './FigmaHomeSidebarContent.mjs'
import { MapLassoLayer, LASSO_DEFAULT_LEVEL, lassoPaletteAt } from './MapLassoLayer.mjs'

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
  const [lassoOn, setLassoOn] = useState(false)
  const [folded, setFolded] = useState(false)
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

  useEffect(() => {
    document.body.dataset.mapInfo = infoOpen ? 'open' : 'closed'
    return () => {
      delete document.body.dataset.mapInfo
    }
  }, [infoOpen])

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
                    })
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
            // the fourth place is kept empty, as in the supplied bar
            createElement('span', { className: 'map-gis-tool map-gis-tool--empty', 'aria-hidden': 'true' })
          )
    ),
    createElement(MapLassoLayer, { active: lassoOn }),
    createElement(
      'section',
      {
        className: `map-gis-info${infoOpen ? ' is-open' : ''}`,
        'aria-label': '정보와 범례',
        hidden: !infoOpen,
        // it opens beside the bar, wherever the bar has been moved to
        style: place ? { left: `${place.x + 3.9}cqw`, top: `${place.y}cqw` } : undefined,
      },
      createElement(MapIntroCard),
      createElement(PageNavigation, { current: 'map' })
    )
  )
}
