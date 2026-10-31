'use client'

import { createElement as h, useEffect, useRef } from 'react'
import { VISIT_ASPECT, circlesAt, createVisits, stepAt } from '../../lib/visit-circles.mjs'

// The red circles of the 'after' picture of cell 2 (lib/visit-circles.mjs), kept as if the visits to
// the houses were counted live: circles are born, swell and shrink, and vanish, thick on whichever
// houses are busy. The picture is redrawn only eight times a second (posterized time) and every
// circle is nudged a very little at each step, so it all moves in small jumps. It is laid
// over the pencil picture inside the same box, fitted into the cell just as the picture is (cover),
// so it is only seen where the 'after' picture is, and it zooms with the picture.
const WIDTH = 1610 // the picture's own width, so a circle's radius is in picture pixels
const HEIGHT = Math.round(WIDTH * VISIT_ASPECT)
const RED = '238, 74, 52'

export function StageVisits() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    // half the picture's size is plenty for thin lines, and keeps drawing light
    const SCALE = 0.75
    canvas.width = Math.round(WIDTH * SCALE)
    canvas.height = Math.round(HEIGHT * SCALE)
    const context = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const slots = createVisits()
    let frame = 0
    let drawn = -1

    const paint = (step) => {
      context.setTransform(SCALE, 0, 0, SCALE, 0, 0)
      context.clearRect(0, 0, WIDTH, HEIGHT)
      for (const [x, y, radius, opacity] of circlesAt(slots, step)) {
        context.beginPath()
        context.arc(x * WIDTH, y * HEIGHT, radius, 0, Math.PI * 2)
        context.lineWidth = radius > 20 ? 1.5 : 2
        context.strokeStyle = `rgba(${RED}, ${opacity.toFixed(3)})`
        context.stroke()
      }
    }

    // the clock is looked at every frame, but the picture is only redrawn when it reaches a new step
    const loop = (now) => {
      frame = window.requestAnimationFrame(loop)
      const step = stepAt(now / 1000)
      if (step === drawn) return
      drawn = step
      paint(step)
    }

    paint(0)
    if (!reduced) frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return h('canvas', { ref: canvasRef, className: 'scale-cell__visits', 'aria-hidden': 'true' })
}
