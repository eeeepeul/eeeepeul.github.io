'use client'

import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// A fixed map of the main land with a heat read-out drifting over it: soft, uneven
// patches of heat that swell, wander and merge, in a blue-to-red scale. Only the heat moves.
const COLS = 128
const ROWS = 72
// A diverging scale on white: cool patches go through cyan, blue and purple, warm ones
// through pale yellow, orange and red to a dark core; the middle is white.
const STOPS = [
  [-1.0, 70, 40, 140, 0.95],
  [-0.78, 118, 74, 190, 0.92],
  [-0.55, 62, 140, 226, 0.88],
  [-0.3, 150, 214, 244, 0.8],
  [-0.1, 226, 244, 252, 0.5],
  [0.0, 255, 255, 255, 0],
  [0.1, 253, 240, 206, 0.72],
  [0.28, 252, 208, 116, 0.88],
  [0.48, 246, 152, 40, 0.92],
  [0.68, 226, 74, 28, 0.94],
  [0.88, 168, 28, 22, 0.96],
  [1.05, 92, 74, 74, 0.98],
]
const RANGE = [-1, 1.05]
const LEVELS = 22 // banded like contour fills
const LUT = new Uint8ClampedArray(256 * 4)
for (let i = 0; i < 256; i += 1) {
  const raw = RANGE[0] + (i / 255) * (RANGE[1] - RANGE[0])
  const v = Math.round(raw * LEVELS * 0.5) / (LEVELS * 0.5)
  let k = 1
  while (k < STOPS.length - 1 && STOPS[k][0] < v) k += 1
  const a = STOPS[k - 1]
  const b = STOPS[k]
  const t = Math.min(1, Math.max(0, (v - a[0]) / (b[0] - a[0])))
  for (let c = 0; c < 3; c += 1) LUT[i * 4 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * t
  LUT[i * 4 + 3] = (a[4] + (b[4] - a[4]) * t) * 255
}

// Each patch is a few overlapping lobes on slow, different loops, so its outline is never
// the same twice.
const PATCHES = [
  { x: 0.3, y: 0.4, rx: 0.2, ry: 0.2, speed: 0.23, phase: 0.2, weight: 1.1, lobes: 3 },
  { x: 0.62, y: 0.3, rx: 0.2, ry: 0.16, speed: 0.17, phase: 2.1, weight: 0.95, lobes: 3 },
  { x: 0.82, y: 0.62, rx: 0.1, ry: 0.16, speed: 0.29, phase: 4.0, weight: -0.9, lobes: 2 },
  { x: 0.2, y: 0.72, rx: 0.14, ry: 0.12, speed: 0.2, phase: 5.2, weight: -1.0, lobes: 3 },
  { x: 0.5, y: 0.78, rx: 0.16, ry: 0.1, speed: 0.26, phase: 1.4, weight: 0.7, lobes: 2 },
  { x: 0.42, y: 0.5, rx: 0.12, ry: 0.14, speed: 0.19, phase: 3.3, weight: -0.7, lobes: 2 },
]

function fillField(field, time) {
  field.fill(0)
  for (const patch of PATCHES) {
    const t = time * patch.speed + patch.phase
    const cx = patch.x + Math.sin(t * 0.9) * patch.rx + Math.sin(t * 2.3 + 1) * patch.rx * 0.25
    const cy = patch.y + Math.cos(t * 0.7) * patch.ry + Math.sin(t * 1.9) * patch.ry * 0.3
    const swell = 0.7 + 0.3 * Math.sin(t * 1.3 + patch.phase)
    for (let l = 0; l < patch.lobes; l += 1) {
      const a = t * (0.8 + l * 0.37) + l * 2.1
      const lx = cx + Math.cos(a) * 0.075 * (1 + l * 0.4)
      const ly = cy + Math.sin(a * 1.2) * 0.1 * (1 + l * 0.3)
      const sx = 0.055 + 0.025 * Math.sin(t * 1.1 + l * 1.7)
      const sy = 0.13 + 0.04 * Math.cos(t * 0.9 + l)
      const amp = patch.weight * swell * (l === 0 ? 1 : 0.62)
      const x0 = Math.max(0, Math.floor((lx - sx * 3) * COLS))
      const x1 = Math.min(COLS - 1, Math.ceil((lx + sx * 3) * COLS))
      const y0 = Math.max(0, Math.floor((ly - sy * 2.6) * ROWS))
      const y1 = Math.min(ROWS - 1, Math.ceil((ly + sy * 2.6) * ROWS))
      for (let y = y0; y <= y1; y += 1) {
        const dy = ((y + 0.5) / ROWS - ly) / (sy * 0.62)
        for (let x = x0; x <= x1; x += 1) {
          const dx = ((x + 0.5) / COLS - lx) / sx
          field[y * COLS + x] += amp * Math.exp(-(dx * dx + dy * dy) * 0.5)
        }
      }
    }
  }
}

function HeatCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    const image = context.createImageData(COLS, ROWS)
    const field = new Float32Array(COLS * ROWS)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = 0
    const draw = (now) => {
      frame = reduced ? 0 : window.requestAnimationFrame(draw)
      if (!reduced && now - last < 33) return
      last = now
      fillField(field, now / 1000)
      const data = image.data
      for (let i = 0; i < field.length; i += 1) {
        const v = Math.min(RANGE[1], Math.max(RANGE[0], field[i] + 0.04))
        const k = Math.round(((v - RANGE[0]) / (RANGE[1] - RANGE[0])) * 255) * 4
        data[i * 4] = LUT[k]
        data[i * 4 + 1] = LUT[k + 1]
        data[i * 4 + 2] = LUT[k + 2]
        data[i * 4 + 3] = LUT[k + 3]
      }
      context.putImageData(image, 0, 0)
    }
    draw(performance.now())
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])
  return createElement('canvas', { ref, className: 'attention-heatmap-heat', width: COLS, height: ROWS, 'aria-hidden': 'true' })
}

export function AttentionHeatmap() {
  return createElement(
    'section',
    { className: 'attention-heatmap', 'aria-label': 'Attention heatmap' },
    createElement(
      'div',
      { className: 'attention-heatmap-body' },
      createElement(
        'div',
        { className: 'attention-heatmap-frame', role: 'img', 'aria-label': 'Heat drifting over a map of the main land' },
        createElement('img', { className: 'attention-heatmap-map', src: assetPath('maps/main-land.webp'), alt: '', draggable: false }),
        createElement(HeatCanvas)
      ),
      createElement(
        'div',
        { className: 'attention-heatmap-legend', 'aria-label': 'Heat scale' },
        createElement('span', { className: 'attention-heatmap-legend-label' }, 'High'),
        createElement('span', { className: 'attention-heatmap-scale', 'aria-hidden': 'true' }),
        createElement('span', { className: 'attention-heatmap-legend-label' }, 'Low')
      )
    )
  )
}
