'use client'

import { createElement as h, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// Cell 15: the supplied picture (476 x 380, shown at 0.521 of that so it fills the 248 x 198 box
// exactly), with its three hand-drawn marks rubbed out. The picture is three things, which are
// called 15-1, 15-2 and 15-3 for now: the stair of squares with its coloured bands (left), the
// navy flow diagram (top right) and the black gauges (bottom right). Each is its own box over its
// own piece of the picture, so any one can be replaced by itself later.
//
// The arrows of 15-2 and 15-3 move. In 15-3 the six white pointers of the gauges were taken out of
// the picture and are drawn again here, each sliding along its own scale at its own pace. In 15-2
// small bright arrowheads run along the lines of the diagram, towards the arrows they end in.
// Everything is placed in the picture's own pixels (476 x 380) and scaled with the box.
const PICTURE = { width: 476, height: 380 }
const PARTS = [
  { id: '15-1', label: '계단 모양 띠', box: [0, 0, 96, 380] },
  { id: '15-2', label: '흐름도', box: [96, 0, 476, 210] },
  { id: '15-3', label: '계기판', box: [96, 210, 476, 380] },
]

// the lines of the flow diagram the arrowheads run along: [y, from x, to x, seconds for one run]
const RUNS = [
  [38, 249, 380, 3.2],
  [128, 247, 278, 1.6],
  [166, 247, 352, 3.0],
  [86, 323, 345, 1.4],
  [131, 400, 424, 1.3],
  [142, 400, 420, 1.2],
  [161, 400, 424, 1.5],
  [45, 210, 249, 1.8],
]

// the gauge pointers: where each one sits, how far it slides, how long a round takes, and where in
// the round it starts
const POINTERS = [
  { kind: 'down', x: 285.5, y: 219, size: 10, slide: 150, axis: 'x', period: 7, phase: 0.4 },
  { kind: 'down', x: 285.5, y: 341.5, size: 9, slide: 150, axis: 'x', period: 9, phase: 2.2 },
  { kind: 'up', x: 224.5, y: 282.5, size: 9, slide: 12, axis: 'x', period: 4.3, phase: 0 },
  { kind: 'up', x: 347.5, y: 282.5, size: 9, slide: 12, axis: 'x', period: 5.1, phase: 1.1 },
  { kind: 'left', x: 150.5, y: 294.5, size: 8, slide: 30, axis: 'y', period: 6.2, phase: 0 },
  { kind: 'left', x: 453.5, y: 294.5, size: 8, slide: 30, axis: 'y', period: 5.5, phase: 2 },
]

// the style that shows just one piece of the picture, in the place that piece has in it
function piece([left, top, right, bottom]) {
  const fx = left / PICTURE.width
  const fy = top / PICTURE.height
  const fw = (right - left) / PICTURE.width
  const fh = (bottom - top) / PICTURE.height
  const percent = (value) => `${(value * 100).toFixed(4)}%`
  return {
    left: percent(fx),
    top: percent(fy),
    width: percent(fw),
    height: percent(fh),
    backgroundImage: `url(${assetPath('media/panel-15.png')})`,
    backgroundSize: `${percent(1 / fw)} ${percent(1 / fh)}`,
    backgroundPosition: `${fw < 1 ? percent(fx / (1 - fw)) : '0%'} ${fh < 1 ? percent(fy / (1 - fh)) : '0%'}`,
  }
}

export function StagePanel15() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let width = 0
    let height = 0

    const fit = () => {
      const box = canvas.getBoundingClientRect()
      const ratio = Math.min(4, (window.devicePixelRatio || 1) * 2)
      width = box.width
      height = box.height
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    fit()

    const triangle = (points) => {
      context.beginPath()
      points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)))
      context.closePath()
      context.fill()
    }

    const draw = (now) => {
      const time = reduced ? 0 : now / 1000
      context.setTransform(canvas.width / PICTURE.width, 0, 0, canvas.height / PICTURE.height, 0, 0)
      context.clearRect(0, 0, PICTURE.width, PICTURE.height)

      // 15-3: the gauge pointers, white, each along its own scale
      context.fillStyle = '#f2f2f2'
      for (const p of POINTERS) {
        const offset = p.slide * Math.sin((time / p.period) * Math.PI * 2 + p.phase)
        const x = p.axis === 'x' ? p.x + offset : p.x
        const y = p.axis === 'y' ? p.y + offset : p.y
        const half = p.size / 2
        const depth = p.size * 0.87 // the height of an even triangle with this base
        if (p.kind === 'down') triangle([[x - half, y - depth / 2], [x + half, y - depth / 2], [x, y + depth / 2]])
        else if (p.kind === 'up') triangle([[x - half, y + depth / 2], [x + half, y + depth / 2], [x, y - depth / 2]])
        else triangle([[x + depth / 2, y - half], [x + depth / 2, y + half], [x - depth / 2, y]])
      }

      // 15-2: arrowheads running along the lines of the diagram
      context.fillStyle = '#fff0a0'
      RUNS.forEach(([y, from, to, seconds], index) => {
        // two arrowheads on the long lines, one on the short ones, a half run apart
        const count = to - from > 60 ? 2 : 1
        for (let k = 0; k < count; k += 1) {
          const t = ((time / seconds + index * 0.19 + k / count) % 1 + 1) % 1
          const x = from + (to - from) * t
          triangle([[x - 3.2, y - 3], [x - 3.2, y + 3], [x + 2.2, y]])
        }
      })

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
    { className: 'panel15' },
    PARTS.map(({ id, label, box }) =>
      h('div', { key: id, className: 'panel15__part', 'data-part': id, role: 'img', 'aria-label': `${id} ${label}`, style: piece(box) })
    ),
    h('canvas', { ref: canvasRef, className: 'panel15__arrows', 'aria-hidden': 'true' })
  )
}
