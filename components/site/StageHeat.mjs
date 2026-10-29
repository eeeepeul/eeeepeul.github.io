'use client'

import { createElement as h, useEffect, useRef } from 'react'
import { HEAT_ASPECT, heatAt, heatColor } from '../../lib/heat-field.mjs'

// The heat over the four houses of cell 2's picture (lib/heat-field.mjs). It is drawn on a small
// canvas (the heat is soft, so a coarse picture is enough, and it is made smooth by the browser's
// own stretching) that is fitted into the cell exactly as the picture under it is (cover), and it
// lives inside the same box as the picture, so the zoom of the cell, which scales that box, scales
// the heat with it and it stays on the houses.
const COLUMNS = 240
const ROWS = Math.round(COLUMNS * HEAT_ASPECT)
const FRAME_MS = 50 // about twenty pictures a second

export function StageHeat() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    canvas.width = COLUMNS
    canvas.height = ROWS
    const context = canvas.getContext('2d')
    const image = context.createImageData(COLUMNS, ROWS)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = -1e9

    const paint = (time) => {
      const data = image.data
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLUMNS; x += 1) {
          const [r, g, b, a] = heatColor(heatAt((x + 0.5) / COLUMNS, (y + 0.5) / ROWS, time))
          const i = (y * COLUMNS + x) * 4
          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          data[i + 3] = a * 255
        }
      }
      context.putImageData(image, 0, 0)
    }

    const loop = (now) => {
      frame = window.requestAnimationFrame(loop)
      if (now - last < FRAME_MS) return
      last = now
      paint(now / 1000)
    }

    paint(3)
    if (!reduced) frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return h('canvas', { ref: canvasRef, className: 'scale-cell__heat', 'aria-hidden': 'true' })
}
