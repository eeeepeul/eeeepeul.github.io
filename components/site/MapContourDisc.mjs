'use client'

import { createElement, useEffect, useRef } from 'react'
import { VIDEO_FIRST_FRAME } from '../../lib/video-geo.mjs'

// A contour read-out of the planet as a turning sphere that turns with the map's own planet: lines of equal value laid on the
// surface (so they bunch up towards the rim as they turn away), a crosshair, the low and
// the high, and Mibal House (the main land) marked. It reads the map planet's turn each frame; with
// no map on the page it swings to and fro about the house instead.
const RAD = Math.PI / 180
const N_LON = 200
const N_LAT = 100
const LEVELS = 26
const MAIN = { lon: VIDEO_FIRST_FRAME.longitude, lat: VIDEO_FIRST_FRAME.latitude }
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

function value(x, y, z) {
  return (
    Math.sin(3.1 * x + 1.9 * y + 0.6 * z + 0.4) * 0.9 +
    Math.sin(2.3 * y - 1.7 * z + 3.3 * x - 1.2) * 0.75 +
    Math.cos(4.1 * x - 2.6 * y + 2.2 * z + 0.9) * 0.5 +
    Math.sin(5.3 * z + 1.1 * x - 0.8 * y) * 0.35 +
    Math.cos(7.2 * x + 4.4 * y - 1.4 * z) * 0.2 +
    Math.sin(9.6 * y - 5.1 * x + 2.3 * z + 1.7) * 0.1
  )
}

const toPoint = (lonDeg, latDeg) => {
  const lon = lonDeg * RAD
  const lat = latDeg * RAD
  return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
}

// Contour segments on the sphere, found once: marching squares over a longitude / latitude grid.
function buildContours() {
  const grid = new Float32Array((N_LON + 1) * (N_LAT + 1))
  const points = []
  for (let j = 0; j <= N_LAT; j += 1) {
    const lat = 90 - (j / N_LAT) * 180
    for (let i = 0; i <= N_LON; i += 1) {
      const lon = (i / N_LON) * 360 - 180
      const p = toPoint(lon, lat)
      points.push(p)
      grid[j * (N_LON + 1) + i] = value(p[0], p[1], p[2])
    }
  }
  const at = (i, j) => j * (N_LON + 1) + i
  let low = 0
  let high = 0
  for (let k = 0; k < grid.length; k += 1) {
    if (grid[k] < grid[low]) low = k
    if (grid[k] > grid[high]) high = k
  }
  const levels = []
  for (let level = 0; level < LEVELS; level += 1) {
    const iso = -2.3 + (4.6 * (level + 0.5)) / LEVELS
    const out = []
    const lerp = (i0, j0, i1, j1) => {
      const a = grid[at(i0, j0)]
      const b = grid[at(i1, j1)]
      const t = (iso - a) / (b - a)
      const p = points[at(i0, j0)]
      const q = points[at(i1, j1)]
      const x = p[0] + (q[0] - p[0]) * t
      const y = p[1] + (q[1] - p[1]) * t
      const z = p[2] + (q[2] - p[2]) * t
      const length = Math.hypot(x, y, z) || 1
      return [x / length, y / length, z / length]
    }
    for (let j = 0; j < N_LAT; j += 1) {
      for (let i = 0; i < N_LON; i += 1) {
        const a = grid[at(i, j)] > iso
        const b = grid[at(i + 1, j)] > iso
        const c = grid[at(i + 1, j + 1)] > iso
        const d = grid[at(i, j + 1)] > iso
        const code = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0)
        if (code === 0 || code === 15) continue
        const top = () => lerp(i, j, i + 1, j)
        const right = () => lerp(i + 1, j, i + 1, j + 1)
        const bottom = () => lerp(i, j + 1, i + 1, j + 1)
        const left = () => lerp(i, j, i, j + 1)
        const table = {
          1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]], 4: [[top, right]],
          5: [[top, left], [bottom, right]], 6: [[top, bottom]], 7: [[top, left]], 8: [[top, left]],
          9: [[top, bottom]], 10: [[top, right], [left, bottom]], 11: [[top, right]], 12: [[left, right]],
          13: [[bottom, right]], 14: [[left, bottom]],
        }
        for (const [p, q] of table[code]) out.push(...p(), ...q())
      }
    }
    levels.push(Float32Array.from(out))
  }
  return { levels, low: points[low], high: points[high] }
}

// The main land: a small ragged island around its point on the globe.
function buildIsland() {
  const centre = toPoint(MAIN.lon, MAIN.lat)
  const east = [Math.cos(MAIN.lon * RAD), 0, -Math.sin(MAIN.lon * RAD)]
  const north = [
    -Math.sin(MAIN.lat * RAD) * Math.sin(MAIN.lon * RAD),
    Math.cos(MAIN.lat * RAD),
    -Math.sin(MAIN.lat * RAD) * Math.cos(MAIN.lon * RAD),
  ]
  const ring = []
  for (let k = 0; k < 18; k += 1) {
    const a = (k / 18) * Math.PI * 2
    const r = (2.3 + Math.sin(a * 3 + 1) * 0.7 + Math.sin(a * 5) * 0.35) * RAD
    ring.push([
      centre[0] + (east[0] * Math.cos(a) + north[0] * Math.sin(a)) * r,
      centre[1] + (east[1] * Math.cos(a) + north[1] * Math.sin(a)) * r,
      centre[2] + (east[2] * Math.cos(a) + north[2] * Math.sin(a)) * r,
    ])
  }
  return { centre, ring }
}

let built = null
const getBuilt = () => {
  if (!built) built = { ...buildContours(), island: buildIsland() }
  return built
}

function Disc() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    const { levels, low, high, island } = getBuilt()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let size = 0
    let frame = 0
    let last = 0
    const view = { lon: null, tilt: 0 }

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const css = canvas.clientWidth || 272
      size = Math.round(css * ratio)
      canvas.width = size
      canvas.height = size
    }

    const draw = (now) => {
      frame = reduced ? 0 : window.requestAnimationFrame(draw)
      if (!reduced && now - last < 33) return
      last = now
      const t = now / 1000
      // Turn with the planet of the map (its yaw and pitch are published on its canvas).
      const globe = document.querySelector('.figma-deep-zoom-globe')
      const parts = globe && globe.dataset.planet ? globe.dataset.planet.split(' ').map(Number) : []
      let targetLon
      let targetTilt
      if (parts.length === 3 && parts.every(Number.isFinite)) {
        targetLon = (-90 - parts[1]) * RAD
        targetTilt = parts[2] * RAD
      } else {
        targetLon = (MAIN.lon + 62 * Math.sin(t * 0.22)) * RAD
        targetTilt = (14 + 7 * Math.sin(t * 0.17 + 1)) * RAD
      }
      if (view.lon === null) {
        view.lon = targetLon
        view.tilt = targetTilt
      } else {
        // a short ease, by the shortest way round, so a jump of the map does not snap
        const delta = Math.atan2(Math.sin(targetLon - view.lon), Math.cos(targetLon - view.lon))
        view.lon += delta * 0.35
        view.tilt += (targetTilt - view.tilt) * 0.35
      }
      const centreLon = view.lon
      const tilt = view.tilt
      const cl = Math.cos(centreLon)
      const sl = Math.sin(centreLon)
      const ct = Math.cos(tilt)
      const st = Math.sin(tilt)
      const c = size / 2
      const R = size * 0.4
      const project = (p) => {
        const x1 = p[0] * cl - p[2] * sl
        const z1 = p[0] * sl + p[2] * cl
        const y2 = p[1] * ct - z1 * st
        const z2 = p[1] * st + z1 * ct
        return [c + R * x1, c - R * y2, z2]
      }
      const px = size / 340 // drawing units follow the size of the canvas

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, size, size)
      context.fillStyle = '#f4f4f2'
      context.fillRect(0, 0, size, size)

      // the body: a faint shading, lighter at the upper left
      const body = context.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R)
      body.addColorStop(0, 'rgba(255,255,255,0.95)')
      body.addColorStop(0.7, 'rgba(236,236,232,0.9)')
      body.addColorStop(1, 'rgba(206,206,200,0.95)')
      context.fillStyle = body
      context.beginPath()
      context.arc(c, c, R, 0, Math.PI * 2)
      context.fill()
      // rings at the rim
      context.strokeStyle = '#6a6a6a'
      for (const [k, w] of [[1.0, 0.9], [1.03, 0.5], [1.055, 0.5]]) {
        context.lineWidth = w * px * 0.7
        context.beginPath()
        context.arc(c, c, R * k, 0, Math.PI * 2)
        context.stroke()
      }

      // contours: the near side in ink, thinning towards the rim; the far side as a ghost
      context.lineCap = 'round'
      for (let pass = 0; pass < 2; pass += 1) {
        for (let level = 0; level < levels.length; level += 1) {
          const data = levels[level]
          const heavy = level % 5 === 0
          context.lineWidth = (heavy ? 0.85 : 0.5) * px * (pass ? 0.6 : 0.75)
          context.strokeStyle = pass ? 'rgba(28,28,28,0.1)' : '#1c1c1c'
          context.beginPath()
          for (let k = 0; k < data.length; k += 6) {
            const a = project([data[k], data[k + 1], data[k + 2]])
            const b = project([data[k + 3], data[k + 4], data[k + 5]])
            const near = (a[2] + b[2]) / 2 > 0
            if (near === !!pass) continue
            if (!pass && (a[2] + b[2]) / 2 < 0.04) continue
            context.moveTo(a[0], a[1])
            context.lineTo(b[0], b[1])
          }
          context.stroke()
        }
      }

      // the main land
      const home = project(island.centre)
      if (home[2] > 0.08) {
        context.fillStyle = '#111'
        context.beginPath()
        island.ring.forEach((p, k) => {
          const q = project(p)
          if (k) context.lineTo(q[0], q[1])
          else context.moveTo(q[0], q[1])
        })
        context.closePath()
        context.fill()
        context.strokeStyle = '#d9262c'
        context.lineWidth = 1.5 * px
        context.beginPath()
        context.arc(home[0], home[1], 11 * px, 0, Math.PI * 2)
        context.stroke()
        // a label on a short leader
        const lx = home[0] + 28 * px
        const ly = home[1] - 30 * px
        context.beginPath()
        context.moveTo(home[0] + 8 * px, home[1] - 8 * px)
        context.lineTo(lx - 2 * px, ly + 4 * px)
        context.lineTo(lx + 74 * px, ly + 4 * px)
        context.stroke()
        context.fillStyle = '#d9262c'
        context.font = `${11 * px}px ${FONT}`
        context.textBaseline = 'alphabetic'
        context.fillText('Mibal House', lx, ly)
      }

      // low and high
      context.fillStyle = '#1c1c1c'
      context.font = `${19 * px}px ${FONT}`
      context.textAlign = 'center'
      for (const [p, label] of [[low, 'L'], [high, 'H']]) {
        const q = project(p)
        if (q[2] > 0.15) context.fillText(label, q[0], q[1] + 7 * px)
      }
      // readings
      context.font = `${11.5 * px}px ${FONT}`
      context.textAlign = 'left'
      context.fillText('−89.2°C', c - R * 0.78, c - R * 0.3)
      context.fillText('−128.6°F', c + R * 0.1, c - R * 0.34)

      // crosshair, stopping just outside the rim
      context.strokeStyle = '#1c1c1c'
      context.lineWidth = 0.8 * px * 0.8
      const reach = R * 1.075
      context.beginPath()
      context.moveTo(c - reach, c)
      context.lineTo(c + reach, c)
      context.moveTo(c, c - reach)
      context.lineTo(c, c + reach)
      context.stroke()
      context.lineWidth = 1.6 * px
      context.beginPath()
      for (const s of [-1, 1]) {
        context.moveTo(c + s * reach, c - 5 * px)
        context.lineTo(c + s * reach, c + 5 * px)
        context.moveTo(c - 5 * px, c + s * reach)
        context.lineTo(c + 5 * px, c + s * reach)
      }
      context.stroke()
    }

    resize()
    window.addEventListener('resize', resize)
    draw(performance.now())
    return () => {
      window.removeEventListener('resize', resize)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])
  return createElement('canvas', { ref, className: 'map-contour__chart', 'aria-hidden': 'true' })
}

export function MapContourDisc() {
  return createElement(
    'section',
    { className: 'map-contour', 'aria-label': 'Contour map of the planet, turning, with Mibal House marked' },
    createElement(Disc)
  )
}
