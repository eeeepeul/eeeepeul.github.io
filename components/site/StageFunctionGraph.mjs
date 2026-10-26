'use client'

import { createElement as h, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { ARROWS, FIELD_ASPECT, FIELD_ORIGIN } from '../../lib/arrow-field.mjs'

// Cell 10: the supplied field picture (a grid of curves with an arrow at each of many points),
// with a score of its arrows alive, filling the cell edge to edge. The picture's own arrows are
// rubbed out of public/panels/arrows-grid.webp and drawn again here, solid and thin, at the place
// and in the direction they had. Each arrow appears all at once where it was, travels outward
// along its own line, and is cut off by the cell's outer edge as if the cell were a mask; when it
// is gone it appears again. The starts are staggered by how far the arrow is from O, so the
// motion leaves O in rings.
const COUNT = 20
const SPEED = 0.17 // cell widths per second
const RIPPLE = 2.2 // seconds between the arrows nearest to O and the farthest, at the start
const PAUSE = 0.35 // seconds an arrow stays gone before it appears again

// the arrows kept: spread over the picture, taking the longest first and then always the one
// farthest from those already taken
function spread(list, count) {
  const middle = ([x1, y1, x2, y2]) => [(x1 + x2) / 2, (y1 + y2) / 2]
  const length = ([x1, y1, x2, y2]) => Math.hypot((x2 - x1) * FIELD_ASPECT, y2 - y1)
  const rest = [...list].sort((a, b) => length(b) - length(a))
  const taken = [rest.shift()]
  while (taken.length < count && rest.length) {
    let best = 0
    let bestGap = -1
    rest.forEach((arrow, index) => {
      const [mx, my] = middle(arrow)
      const gap = Math.min(...taken.map((other) => {
        const [ox, oy] = middle(other)
        return Math.hypot((mx - ox) * FIELD_ASPECT, my - oy)
      }))
      if (gap > bestGap) {
        bestGap = gap
        best = index
      }
    })
    taken.push(rest.splice(best, 1)[0])
  }
  return taken
}

export function StageFunctionGraph() {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return undefined
    const context = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let width = 0
    let height = 0

    const fit = () => {
      const box = root.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = box.width
      height = box.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(root)
    fit()

    // each arrow: where it starts, its length and direction as fractions of the cell, and when its
    // first appearance falls
    const [ox, oy] = FIELD_ORIGIN
    const kept = spread(ARROWS, COUNT)
    const reach = Math.max(...kept.map(([x1, y1]) => Math.hypot((x1 - ox) * FIELD_ASPECT, y1 - oy)))
    const arrows = kept.map(([x1, y1, x2, y2]) => ({
      x1,
      y1,
      dx: x2 - x1,
      dy: y2 - y1,
      delay: (Math.hypot((x1 - ox) * FIELD_ASPECT, y1 - oy) / reach) * RIPPLE,
    }))

    const draw = (now) => {
      const time = reduced ? 1.2 : now / 1000
      const dpr = canvas.width / Math.max(1, width)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)
      context.lineCap = 'round'
      context.fillStyle = '#0d0d0d'
      context.strokeStyle = '#0d0d0d'
      const line = Math.max(0.5, width * 0.0032)
      const headSize = Math.max(2.2, width * 0.02)
      const speed = SPEED * width
      for (const arrow of arrows) {
        const startX = arrow.x1 * width
        const startY = arrow.y1 * height
        const vx = arrow.dx * width
        const vy = arrow.dy * height
        const length = Math.hypot(vx, vy)
        if (length < 1) continue
        const ux = vx / length
        const uy = vy / length
        // how far it must go before its tail has left the cell, and so how long one round takes
        const toX = ux > 0 ? (width - startX) / ux : ux < 0 ? -startX / ux : Infinity
        const toY = uy > 0 ? (height - startY) / uy : uy < 0 ? -startY / uy : Infinity
        const way = Math.min(toX, toY) + 1
        const round = way / speed + PAUSE
        const clock = (((time - arrow.delay) % round) + round) % round
        const travelled = clock * speed
        if (travelled > way) continue
        const tailX = startX + ux * travelled
        const tailY = startY + uy * travelled
        const headX = tailX + vx
        const headY = tailY + vy
        const size = Math.min(headSize, length * 0.45)
        context.lineWidth = line
        context.beginPath()
        context.moveTo(tailX, tailY)
        context.lineTo(headX - ux * size * 0.6, headY - uy * size * 0.6)
        context.stroke()
        context.beginPath()
        context.moveTo(headX, headY)
        context.lineTo(headX - ux * size - uy * size * 0.45, headY - uy * size + ux * size * 0.45)
        context.lineTo(headX - ux * size + uy * size * 0.45, headY - uy * size - ux * size * 0.45)
        context.closePath()
        context.fill()
      }
      if (!reduced) frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return h(
    'div',
    { ref: rootRef, className: 'fgraph-root' },
    h('img', { className: 'fgraph-img', src: assetPath('panels/arrows-grid.webp'), alt: '', draggable: false }),
    h('canvas', { ref: canvasRef, className: 'fgraph-canvas', role: 'img', 'aria-label': 'O에서 퍼져 나가는 화살표가 계속 움직이는 그래프' })
  )
}
