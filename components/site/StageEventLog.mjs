'use client'

import { createElement, useEffect, useRef, useState } from 'react'

// Cell 8: a live log of what is being clicked. The visitor's own clicks go in at once, in the
// pale style; the rest of the rows are other visitors, shown as if they were on the site at the
// same time, in the dark style. The other visitors here are simulated for the look of the panel:
// nothing is read from anyone else.
const MAX_ROWS = 6
const LIVE_MS = 6000
const COLUMNS = ['Time', 'Event', 'Target', 'Page', 'X', 'Y', 'Status']

// Names for the things on the page that can be pressed (by their aria-label).
const TARGET_NAMES = {
  '시점 초기화': 'reset_view',
  '올가미 도구 켜기': 'lasso',
  '올가미 도구 끄기': 'lasso',
  '정보와 범례': 'info',
  '마지막 면 되돌리기': 'lasso_undo',
  '그린 면 모두 지우기': 'lasso_clear',
  '확대': 'zoom_in',
  '축소': 'zoom_out',
}

// What other visitors might be doing: [event, target, page, has a position].
const OTHERS = [
  ['Click', 'map', '/home', true],
  ['Zoom', 'map', '/home', false],
  ['Click', 'lasso', '/home', true],
  ['Click', 'reset_view', '/home', true],
  ['Open', 'info', '/home', true],
  ['Click', 'point_relief', '/home', true],
  ['Click', 'house_01', '/home', true],
  ['Click', 'flow_chart', '/home', true],
  ['Play', 'zoom_in', '/locations', false],
  ['Click', 'play_button', '/home', true],
  ['Open', 'audio_track', '/locations', true],
  ['Click', 'map', '/music', true],
  ['Play', '/products', '/home', false],
  ['Open', 'nav_pricing', '/home', true],
]

let nextId = 1

function clock(at) {
  const date = new Date(at)
  const two = (value) => String(value).padStart(2, '0')
  return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`
}

function pageName() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/' ? '/home' : path
}

function describe(element) {
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    if (node.dataset && node.dataset.log) return node.dataset.log
    const label = node.getAttribute && node.getAttribute('aria-label')
    if (label && TARGET_NAMES[label]) return TARGET_NAMES[label]
  }
  if (element.closest && element.closest('.figma-deep-zoom-map')) return 'map'
  const cell = element.closest && element.closest('[data-stage-cell]')
  return cell ? `cell_${cell.dataset.stageCell}` : 'page'
}

function randomOther(at) {
  const [event, target, page, hasPosition] = OTHERS[Math.floor(Math.random() * OTHERS.length)]
  return {
    id: nextId++,
    own: false,
    at,
    event,
    target,
    page,
    x: hasPosition ? Math.round(20 + Math.random() * 1880) : null,
    y: hasPosition ? Math.round(20 + Math.random() * 1020) : null,
  }
}

export function StageEventLog() {
  const [rows, setRows] = useState([])
  const [now, setNow] = useState(0)
  const lastZoomRef = useRef(0)

  useEffect(() => {
    const start = Date.now()
    setNow(start)
    // A few that have just happened, so the log is not empty when it opens.
    setRows(Array.from({ length: MAX_ROWS - 1 }, (_, k) => randomOther(start - (k + 1) * 3200)))

    const push = (row) => setRows((current) => [row, ...current].slice(0, MAX_ROWS))
    const ownRow = (event, target, x, y) =>
      push({ id: nextId++, own: true, at: Date.now(), event, target, page: pageName(), x, y })

    const onDown = (event) => {
      if (event.button > 0) return
      const target = describe(event.target)
      ownRow(target === 'info' ? 'Open' : 'Click', target, Math.round(event.clientX), Math.round(event.clientY))
    }
    const onWheel = (event) => {
      if (!event.target.closest || !event.target.closest('.figma-deep-zoom-map')) return
      const time = Date.now()
      if (time - lastZoomRef.current < 700) return
      lastZoomRef.current = time
      ownRow('Zoom', event.deltaY > 0 ? 'zoom_in' : 'zoom_out', null, null)
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('wheel', onWheel, { passive: true, capture: true })

    // Presses inside the pages shown in cells do not reach this page, so listen there too.
    const named = { 1: 'point_relief', 6: 'house_01', 11: 'flow_chart' }
    const cleanups = []
    document.querySelectorAll('[data-stage-cell] iframe').forEach((frame) => {
      const cell = frame.closest('[data-stage-cell]')?.dataset.stageCell
      const attach = () => {
        try {
          const doc = frame.contentDocument
          if (!doc) return
          const handler = (event) => {
            if (event.button > 0) return
            const box = frame.getBoundingClientRect()
            ownRow('Click', named[cell] || `cell_${cell}`, Math.round(box.left + event.clientX), Math.round(box.top + event.clientY))
          }
          doc.addEventListener('pointerdown', handler, true)
          cleanups.push(() => doc.removeEventListener('pointerdown', handler, true))
        } catch {
          // a page from another origin cannot be listened to
        }
      }
      attach()
      frame.addEventListener('load', attach)
      cleanups.push(() => frame.removeEventListener('load', attach))
    })

    // Other visitors, now and then.
    let timer = 0
    const another = () => {
      push(randomOther(Date.now()))
      timer = window.setTimeout(another, 1800 + Math.random() * 3800)
    }
    timer = window.setTimeout(another, 1500 + Math.random() * 2000)
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000)

    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('wheel', onWheel, { capture: true })
      cleanups.forEach((cleanup) => cleanup())
      window.clearTimeout(timer)
      window.clearInterval(clockTimer)
    }
  }, [])

  return createElement(
    'table',
    { className: 'event-log', 'aria-label': '클릭 기록' },
    createElement(
      'colgroup',
      null,
      [13.67, 13.68, 21.71, 12.77, 12.63, 12.63, 12.91].map((width, index) =>
        createElement('col', { key: index, style: { width: `${width}%` } })
      )
    ),
    createElement(
      'thead',
      null,
      createElement('tr', { className: 'event-log__head' }, COLUMNS.map((name) => createElement('th', { key: name }, name)))
    ),
    createElement(
      'tbody',
      null,
      rows.map((row) =>
        createElement(
          'tr',
          { key: row.id, className: `event-log__row${row.own ? ' is-own' : ''}` },
          createElement('td', null, clock(row.at)),
          createElement('td', null, row.event),
          createElement('td', null, row.target),
          createElement('td', null, row.page),
          createElement('td', null, row.x == null ? '-' : row.x),
          createElement('td', null, row.y == null ? '-' : row.y),
          createElement('td', null, now - row.at < LIVE_MS ? 'LIVE' : 'OK')
        )
      )
    )
  )
}
