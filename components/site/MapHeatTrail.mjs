'use client'

import { createElement, useEffect, useRef } from 'react'
import { LASSO_DEFAULT_LEVEL, lassoPaletteAt } from './MapLassoLayer.mjs'

// The pointer stirs a small liquid: it leaves heat that is dragged along by the motion,
// spreads, swells and cools away. The heat is shown through a thermal palette (lavender
// haze, pink, hot red, and a pale pink where it is hottest), so it reads as a thermal
// camera looking at something fluid.
const MAX_CELLS = 90000 // keeps the simulation light on large screens
const LUT_SIZE = 256
const LUT_MAX = 1.6
const ALPHA_STOPS = [[0, 0], [0.05, 0.16], [0.2, 0.6], [0.4, 0.92], [0.55, 1]]
const smooth = (t) => t * t * (3 - 2 * t)

// Heat -> colour, through the palette picked on the lasso panel (rim ... core).
function buildLut(level) {
  const palette = lassoPaletteAt(level)
  const lut = new Uint8ClampedArray(LUT_SIZE * 4)
  for (let i = 0; i < LUT_SIZE; i += 1) {
    const h = (i / (LUT_SIZE - 1)) * LUT_MAX
    const f = Math.min(1, h / 1.35) * 3
    const k = Math.min(2, Math.floor(f))
    const t = smooth(f - k)
    for (let c = 0; c < 3; c += 1) lut[i * 4 + c] = palette[k][c] + (palette[k + 1][c] - palette[k][c]) * t
    let alpha = 1
    for (let j = 1; j < ALPHA_STOPS.length; j += 1) {
      if (h <= ALPHA_STOPS[j][0]) {
        const lo = ALPHA_STOPS[j - 1]
        const hi = ALPHA_STOPS[j]
        alpha = lo[1] + ((hi[1] - lo[1]) * (h - lo[0])) / (hi[0] - lo[0])
        break
      }
    }
    lut[i * 4 + 3] = alpha * 255
  }
  return lut
}

export function MapHeatTrail({ active = true }) {
  const canvasRef = useRef(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const context = canvas.getContext('2d')
    let CELL = 3 // screen pixels per simulation cell
    let cols = 0
    let rows = 0
    let heat
    let heatNext
    let vx
    let vy
    let vxNext
    let vyNext
    let image
    let frame = 0
    let lut = buildLut(window.__mapLassoLevel ?? LASSO_DEFAULT_LEVEL)
    let running = false
    let lastTime = 0
    let pointer = null
    let smooth = null
    let previous = null

    const resize = () => {
      CELL = Math.max(3, Math.ceil(Math.sqrt((window.innerWidth * window.innerHeight) / MAX_CELLS)))
      cols = Math.max(8, Math.ceil(window.innerWidth / CELL))
      rows = Math.max(8, Math.ceil(window.innerHeight / CELL))
      canvas.width = cols
      canvas.height = rows
      const size = cols * rows
      heat = new Float32Array(size)
      heatNext = new Float32Array(size)
      vx = new Float32Array(size)
      vy = new Float32Array(size)
      vxNext = new Float32Array(size)
      vyNext = new Float32Array(size)
      image = context.createImageData(cols, rows)
    }

    const splat = (x, y, dx, dy, strength) => {
      const radius = 10 / CELL
      const reach = Math.ceil(radius * 2)
      const cx = x / CELL
      const cy = y / CELL
      for (let j = Math.max(0, Math.floor(cy - reach)); j <= Math.min(rows - 1, Math.ceil(cy + reach)); j += 1) {
        for (let i = Math.max(0, Math.floor(cx - reach)); i <= Math.min(cols - 1, Math.ceil(cx + reach)); i += 1) {
          const d2 = ((i - cx) * (i - cx) + (j - cy) * (j - cy)) / (radius * radius)
          if (d2 > 4) continue
          const w = Math.exp(-d2)
          const at = j * cols + i
          heat[at] = Math.min(2, heat[at] + strength * w)
          vx[at] += dx * w * 0.5
          vy[at] += dy * w * 0.5
        }
      }
    }

    const sample = (field, x, y) => {
      const cx = Math.min(cols - 1.001, Math.max(0, x))
      const cy = Math.min(rows - 1.001, Math.max(0, y))
      const i = Math.floor(cx)
      const j = Math.floor(cy)
      const fx = cx - i
      const fy = cy - j
      const at = j * cols + i
      return (
        (field[at] * (1 - fx) + field[at + 1] * fx) * (1 - fy) +
        (field[at + cols] * (1 - fx) + field[at + cols + 1] * fx) * fy
      )
    }

    const step = (dt) => {
      // Carry heat and motion along the motion (semi-Lagrangian), then let both spread a
      // little and fade.
      const speedScale = dt * 60
      const fade = Math.pow(0.982, speedScale)
      const slow = Math.pow(0.95, speedScale)
      let peak = 0
      for (let j = 1; j < rows - 1; j += 1) {
        for (let i = 1; i < cols - 1; i += 1) {
          const at = j * cols + i
          const fromX = i - vx[at] * speedScale
          const fromY = j - vy[at] * speedScale
          const h = sample(heat, fromX, fromY)
          const u = sample(vx, fromX, fromY)
          const v = sample(vy, fromX, fromY)
          const mix = 0.2 * speedScale
          const around = (a) => (a[at - 1] + a[at + 1] + a[at - cols] + a[at + cols]) * 0.25
          heatNext[at] = (h * (1 - mix) + around(heat) * mix) * fade
          vxNext[at] = (u * (1 - mix) + around(vx) * mix) * slow
          vyNext[at] = (v * (1 - mix) + around(vy) * mix) * slow
          if (heatNext[at] > peak) peak = heatNext[at]
        }
      }
      // The edge cells are never updated by the loop above: keep them empty, or heat and
      // motion left there would stay for good and the effect would never settle.
      for (let i = 0; i < cols; i += 1) {
        for (const at of [i, (rows - 1) * cols + i]) {
          heatNext[at] = 0
          vxNext[at] = 0
          vyNext[at] = 0
        }
      }
      for (let j = 0; j < rows; j += 1) {
        for (const at of [j * cols, j * cols + cols - 1]) {
          heatNext[at] = 0
          vxNext[at] = 0
          vyNext[at] = 0
        }
      }
      ;[heat, heatNext] = [heatNext, heat]
      ;[vx, vxNext] = [vxNext, vx]
      ;[vy, vyNext] = [vyNext, vy]
      return peak
    }

    const paint = () => {
      const data = image.data
      const scale = (LUT_SIZE - 1) / LUT_MAX
      for (let at = 0, size = cols * rows; at < size; at += 1) {
        const h = heat[at]
        const o = at * 4
        if (h < 0.01) {
          data[o + 3] = 0
          continue
        }
        const k = Math.min(LUT_SIZE - 1, Math.round(h * scale)) * 4
        data[o] = lut[k]
        data[o + 1] = lut[k + 1]
        data[o + 2] = lut[k + 2]
        data[o + 3] = lut[k + 3]
      }
      context.putImageData(image, 0, 0)
    }

    const tick = (now) => {
      frame = 0
      const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000 || 0.016))
      lastTime = now
      if (pointer) {
        if (!smooth) smooth = { ...pointer }
        const from = { x: smooth.x, y: smooth.y }
        smooth.x += (pointer.x - smooth.x) * 0.2
        smooth.y += (pointer.y - smooth.y) * 0.2
        const dx = smooth.x - from.x
        const dy = smooth.y - from.y
        const distance = Math.hypot(dx, dy)
        if (distance > 0.3) {
          // Stamp along the way so a fast move leaves one unbroken smear.
          const stamps = Math.min(40, Math.max(1, Math.ceil(distance / (CELL * 0.8))))
          const speed = distance / (dt * 60)
          const strength = Math.min(0.3, 0.09 + speed * 0.03) / Math.sqrt(stamps) * 1.6
          for (let s = 1; s <= stamps; s += 1) {
            const u = s / stamps
            splat(from.x + dx * u, from.y + dy * u, (dx / CELL) * 0.25, (dy / CELL) * 0.25, strength)
          }
        }
      }
      const peak = step(dt)
      paint()
      const stirring = pointer && smooth && Math.hypot(pointer.x - smooth.x, pointer.y - smooth.y) > 0.5
      if (peak > 0.012 || stirring) {
        frame = window.requestAnimationFrame(tick)
      } else {
        running = false
        context.clearRect(0, 0, cols, rows)
      }
    }

    const start = () => {
      if (running) return
      running = true
      lastTime = performance.now()
      frame = window.requestAnimationFrame(tick)
    }

    const onMove = (event) => {
      if (!activeRef.current || event.pointerType === 'touch' || event.buttons) return
      if (!pointer) smooth = null // coming back in: start from here, not from where it left
      const margin = CELL * 2
      pointer = {
        x: Math.min(window.innerWidth - margin, Math.max(margin, event.clientX)),
        y: Math.min(window.innerHeight - margin, Math.max(margin, event.clientY)),
      }
      start()
    }

    resize()
    window.addEventListener('resize', resize)
    const onLevel = (event) => {
      lut = buildLut(event.detail.level)
    }
    window.addEventListener('map:lasso-level', onLevel)
    const onLeave = (event) => {
      // The pointer left the page: stop stirring where it left, let the heat fade.
      if (!event.relatedTarget) pointer = null
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseout', onLeave)
    window.addEventListener('blur', () => {
      pointer = null
    })
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('map:lasso-level', onLevel)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseout', onLeave)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return createElement('canvas', { ref: canvasRef, className: 'map-heat-trail', 'aria-hidden': 'true' })
}
