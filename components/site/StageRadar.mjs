'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// Cell 7: the radar and the scope. The radar is drawn on a plane of 446 x 314 units (the
// supplied picture): a grid, readouts, three arcs, a turning sweep, and on it the houses (round dots,
// fixed, each glowing in turn) and the people coming to them (a star and MMH, moving slowly
// towards the house they are headed for, and gone when they get there; another sets out).
const W = 446
const H = 314
const CX = 226
const CY = 293.3
const SWEEP = [339.3, 124.7]
const HOUSES = [
  { x: 179, y: 165 },
  { x: 208.7, y: 212.7 },
  { x: 168.7, y: 243 },
  { x: 182.7, y: 258.7 },
]
const SPEED = 7 // units a second
const SWEEP_PERIOD = 6 // seconds for the sweep to go once round, always clockwise
const TRAIL = 34.6 // degrees of glow left behind the line
const RAD = Math.PI / 180

// the angle of a point from straight up, clockwise, round the centre of the radar
// The glow the sweep leaves behind is cut into thin slices that fade by angle: nothing at the
// trailing edge, most at the line, so no edge of the wedge shows.
const WEDGE_SLICE_COUNT = 56
const WEDGE_SLICES = Array.from({ length: WEDGE_SLICE_COUNT }, (_, i) => {
  const t0 = i / WEDGE_SLICE_COUNT
  const t1 = (i + 1) / WEDGE_SLICE_COUNT
  const point = (t, extra = 0) => {
    const angle = (-TRAIL + t * TRAIL) * RAD + extra * RAD
    return `${(CX + 204 * Math.sin(angle)).toFixed(2)} ${(CY - 204 * Math.cos(angle)).toFixed(2)}`
  }
  const t = (t0 + t1) / 2
  return {
    key: i,
    d: `M${CX} ${CY - 4}L${point(t0)}A204 204 0 0 1 ${point(t1, 0.3)}Z`,
    opacity: 0.5 * t * t,
  }
})

const bearing = (x, y) => Math.atan2(x - CX, CY - y) / RAD
const START = [
  { x: 267.7, y: 134, house: 1 },
  { x: 302.7, y: 196, house: 3 },
  { x: 402, y: 280, house: 0 },
]

const rows = (columns, values) =>
  values.map((value, row) =>
    createElement(
      'text',
      { key: row, x: columns[0], y: 38 + row * 10 },
      value
    )
  )

function spawn(id) {
  // a place in the open, out towards the rim
  const angle = ((Math.random() * 150 - 75) * Math.PI) / 180
  const radius = 120 + Math.random() * 80
  return {
    id,
    x: CX + Math.sin(angle) * radius,
    y: Math.min(286, CY - Math.cos(angle) * radius),
    house: Math.floor(Math.random() * HOUSES.length),
    alpha: 0,
    state: 'in',
  }
}

const ticks = (count, step, lengths) =>
  Array.from({ length: count }, (_, k) => ({ at: k * step, length: lengths(k) }))

// The round scope on the right: the laptop's camera, once it is let in, shows
// in the circle as a coarse mosaic, flipped like a mirror. The camera is asked for when the page
// opens (the browser asks the visitor); press the scope to switch it off or on again.
function ScopeCamera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const frameRef = useRef(0)
  const [status, setStatus] = useState('off') // off | on | denied

  const stop = () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 }, audio: false })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play().catch(() => {})
      setStatus('on')
      const COLUMNS = 26
      const small = document.createElement('canvas')
      small.width = COLUMNS
      small.height = COLUMNS
      const smallContext = small.getContext('2d', { willReadFrequently: true })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      canvas.width = 260
      canvas.height = 260
      context.imageSmoothingEnabled = false
      const draw = () => {
        frameRef.current = window.requestAnimationFrame(draw)
        if (video.readyState < 2 || !video.videoWidth) return
        const side = Math.min(video.videoWidth, video.videoHeight)
        smallContext.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, COLUMNS, COLUMNS)
        context.drawImage(small, 0, 0, COLUMNS, COLUMNS, 0, 0, canvas.width, canvas.height)
      }
      frameRef.current = window.requestAnimationFrame(draw)
    } catch {
      setStatus('denied')
    }
  }

  // The camera is asked for as soon as the page is up; if it is refused, the photograph stays.
  useEffect(() => {
    start()
    return () => stop()
  }, [])

  const toggle = () => {
    if (status === 'on') {
      stop()
      setStatus('off')
    } else {
      start()
    }
  }

  return createElement(
    'div',
    {
      className: `radar-scope${status === 'on' ? ' is-live' : ''}`,
      role: 'button',
      tabIndex: 0,
      'aria-pressed': status === 'on',
      'aria-label': status === 'on' ? '카메라 끄기' : '카메라 켜기',
      title: status === 'denied' ? '카메라 권한이 없거나 카메라를 찾지 못했습니다' : status === 'on' ? '카메라 끄기' : '카메라 켜기',
      onClick: toggle,
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggle()
        }
      },
    },
    createElement('img', { className: 'radar-scope__photo', src: assetPath('panels/scope.png'), alt: '', draggable: false }),
    createElement('video', { ref: videoRef, className: 'radar-scope__source', muted: true, playsInline: true }),
    createElement('canvas', { ref: canvasRef, className: 'radar-scope__mosaic' }),
    createElement(
      'svg',
      { className: 'radar-scope__sight', viewBox: '0 0 314 314', 'aria-hidden': 'true' },
      createElement('circle', { cx: 157, cy: 156, r: 134, fill: 'none', stroke: '#d4d4d4', strokeWidth: 2.4 }),
      createElement('path', { d: 'M23 156H291M157 22V290', stroke: '#d4d4d4', strokeWidth: 2.2, fill: 'none' })
    )
  )
}

export function StageRadar() {
  const [people, setPeople] = useState(() => START.map((p, k) => ({ ...p, id: k, alpha: 1, state: 'walk' })))
  const [glow, setGlow] = useState(HOUSES.map(() => 0))
  const [time, setTime] = useState(0)
  const [sweep, setSweep] = useState(SWEEP[0] > 0 ? 34.6 : 0)
  const [pings, setPings] = useState({})
  const state = useRef({ people, glow: HOUSES.map(() => 0), next: START.length, angle: 34.6, ping: {} })

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let frame = 0
    let last = performance.now()
    let drawn = 0
    const step = (now) => {
      frame = window.requestAnimationFrame(step)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (document.hidden) return
      const s = state.current
      // The sweep turns clockwise, all the way round: below the base line it is out of sight, and it
      // comes back into view from the left, as a turning arm would.
      const before = s.angle
      s.angle = (s.angle + (360 / SWEEP_PERIOD) * dt) % 360
      const wrapped = s.angle < before
      const crossed = (b) => {
        const at = (b + 360) % 360
        return wrapped ? at >= before || at < s.angle : before <= at && at < s.angle
      }
      s.glow = s.glow.map((g, k) => {
        const b = bearing(HOUSES[k].x, HOUSES[k].y)
        return crossed(b) ? Math.max(g, 0.75) : Math.max(0, g - dt * 0.7)
      })
      Object.keys(s.ping).forEach((id) => {
        s.ping[id] = Math.max(0, s.ping[id] - dt * 1.2)
        if (s.ping[id] === 0) delete s.ping[id]
      })
      s.people = s.people
        .map((p) => {
          const target = HOUSES[p.house]
          const dx = target.x - p.x
          const dy = target.y - p.y
          const distance = Math.hypot(dx, dy)
          if (p.state === 'in') {
            const alpha = Math.min(1, p.alpha + dt * 1.5)
            return { ...p, alpha, state: alpha >= 1 ? 'walk' : 'in' }
          }
          if (p.state === 'out') return { ...p, alpha: p.alpha - dt * 1.8 }
          if (distance < 3.5) {
            s.glow[p.house] = 1
            return { ...p, state: 'out' }
          }
          return { ...p, x: p.x + (dx / distance) * SPEED * dt, y: p.y + (dy / distance) * SPEED * dt }
        })
        .filter((p) => p.alpha > 0)
      s.people.forEach((p) => {
        if (p.state !== 'out' && crossed(bearing(p.x, p.y))) s.ping[p.id] = 1
      })
      while (s.people.length < START.length) {
        s.people.push(spawn(s.next))
        s.next += 1
      }
      if (now - drawn > 33) {
        drawn = now
        setPeople(s.people)
        setGlow(s.glow)
        setSweep(s.angle)
        setPings({ ...s.ping })
        setTime(now / 1000)
      }
    }
    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const topTicks = ticks(60, 7.0, (k) => (k % 5 === 0 ? 12 : 4.5))
  const sideTicks = ticks(40, 7.2, (k) => (k % 5 === 0 ? 12 : 4.5))

  return createElement(
    'div',
    { className: 'radar' },
    createElement(
      'svg',
      { className: 'radar-plane', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': '집으로 오는 사람들의 레이더' },
      createElement(
        'defs',
        null,
        createElement(
          'radialGradient',
          { id: 'radar-halo' },
          createElement('stop', { offset: 0, stopColor: '#fff', stopOpacity: 0.85 }),
          createElement('stop', { offset: 1, stopColor: '#fff', stopOpacity: 0 })
        )
      ),
      createElement('rect', { width: W, height: H, fill: '#5f5f5f' }),
      // the grid
      createElement('path', {
        d:
          Array.from({ length: 28 }, (_, k) => `M${10 + k * 16} 0V${H}`).join('') +
          Array.from({ length: 20 }, (_, k) => `M0 ${13 + k * 16}H${W}`).join(''),
        stroke: '#706f6f',
        strokeWidth: 1,
        fill: 'none',
      }),
      // the rulers along the edges
      createElement('path', {
        d:
          topTicks.map((t) => `M${20 + t.at} 0v${t.length}M${20 + t.at} ${H}v-${t.length}`).join('') +
          sideTicks.map((t) => `M0 ${20 + t.at}h${t.length}M${W} ${20 + t.at}h-${t.length}`).join(''),
        stroke: '#a8a8a8',
        strokeWidth: 0.8,
        opacity: 0.7,
        fill: 'none',
      }),
      [[4, 4], [430, 4], [4, 298], [430, 298]].map(([x, y]) =>
        createElement('rect', { key: `${x}-${y}`, x, y, width: 12, height: 12, fill: '#a5a5a5' })
      ),
      // the readouts
      [24, 29.3, 35.7, 42.7, 48.7, 54.7, 60.7].map((x, k) =>
        createElement('rect', { key: `sq${k}`, x, y: 23.8, width: 4.2, height: 4, fill: k === 2 ? '#fff' : '#a5a5a5' })
      ),
      createElement(
        'g',
        { className: 'radar-text' },
        [24, 52.7, 80.7].map((x) =>
          ['20010', '45520', '33100', '00210'].map((value, row) =>
            createElement('text', { key: `l${x}${row}`, x, y: 38 + row * 10 }, value)
          )
        ),
        [368, 396.7].map((x) =>
          ['20010', '45520', '33100', '00210'].map((value, row) =>
            createElement('text', { key: `r${x}${row}`, x, y: 74 + row * 10 }, value)
          )
        )
      ),
      [[382, 24, 40], [398, 34.3, 24], [362, 44.3, 60], [374, 54.3, 48]].map(([x, y, width], k) =>
        createElement('rect', { key: `bar${k}`, x, y, width, height: 7.6, fill: '#a8a8a8' })
      ),
      // what the sweep has passed over, and the sweep itself, turning about the centre
      createElement('clipPath', { id: 'radar-upper' }, createElement('rect', { x: 0, y: 0, width: W, height: CY + 1 })),
      createElement(
        'g',
        { clipPath: 'url(#radar-upper)' },
        createElement(
          'g',
          { transform: `rotate(${sweep.toFixed(2)} ${CX} ${CY})` },
          WEDGE_SLICES.map((slice) =>
            createElement('path', { key: slice.key, d: slice.d, fill: '#fff', fillOpacity: slice.opacity })
          ),
          createElement('path', { d: `M${CX} ${CY - 4}V${CY - 204}`, stroke: '#fff', strokeWidth: 3, fill: 'none' })
        )
      ),
      // the arcs
      createElement('path', { d: `M22 ${CY}A204 204 0 0 1 430 ${CY}`, stroke: '#cfcfcf', strokeWidth: 2.6, fill: 'none' }),
      createElement('path', { d: `M88 ${CY}A138 138 0 0 1 364 ${CY}`, stroke: '#cfcfcf', strokeWidth: 2, strokeDasharray: '9 6', fill: 'none' }),
      createElement('path', { d: `M156 ${CY}A70 70 0 0 1 296 ${CY}`, stroke: '#cfcfcf', strokeWidth: 2, strokeDasharray: '9 6', fill: 'none' }),
      createElement('path', { d: `M${CX} 78.7V302`, stroke: '#a2a2a2', strokeWidth: 2.6, fill: 'none' }),
      createElement('circle', { cx: CX, cy: 95.7, r: 3.4, fill: 'none', stroke: '#8e8e8e', strokeWidth: 1.4 }),
      createElement('path', { d: `M214 ${CY - 2.5}h24`, stroke: '#d8d8d8', strokeWidth: 2, fill: 'none' }),
      // the houses: fixed, each glowing
      HOUSES.map((house, k) => {
        const phase = (time * 0.55 + k * 0.27) % 1
        const flash = glow[k]
        return createElement(
          'g',
          { key: `house${k}` },
          createElement('circle', {
            cx: house.x,
            cy: house.y,
            r: 5 + phase * 13,
            fill: 'none',
            stroke: '#fff',
            strokeWidth: 1.2,
            opacity: (1 - phase) * 0.55,
          }),
          createElement('circle', { cx: house.x, cy: house.y, r: 11 + flash * 8, fill: 'url(#radar-halo)', opacity: 0.25 + 0.2 * Math.sin(time * 2.2 + k) + flash * 0.6 }),
          createElement('circle', { cx: house.x, cy: house.y, r: 4.7, fill: flash > 0.2 ? '#fff' : '#c4c4c4' })
        )
      }),
      // the people on their way
      people.map((p) =>
        createElement(
          'g',
          { key: `p${p.id}`, opacity: Math.max(0, Math.min(1, p.alpha)) },
          pings[p.id] ? createElement('circle', { cx: p.x, cy: p.y, r: 4 + (1 - pings[p.id]) * 12, fill: 'none', stroke: '#fff', strokeWidth: 1, opacity: pings[p.id] * 0.8 }) : null,
          createElement('path', {
            d: `M${p.x - 4} ${p.y}h8M${p.x} ${p.y - 4}v8M${p.x - 2.8} ${p.y - 2.8}l5.6 5.6M${p.x + 2.8} ${p.y - 2.8}l-5.6 5.6`,
            stroke: '#fff',
            strokeWidth: 1.1,
            fill: 'none',
          }),
          createElement('text', { x: p.x + 8, y: p.y + 10, className: 'radar-mmh' }, 'MMH')
        )
      )
    ),
    createElement(ScopeCamera)
  )
}
