'use client'

import { createElement as h, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { ARROW_GRID } from '../../lib/arrow-grid.mjs'

// Cell 10: the supplied field picture (a grid of curves) with its own arrows rubbed out of
// public/panels/arrows-grid.webp, filling the cell edge to edge. Over it a field of arrows is drawn
// as in the supplied vector-field picture: the same number of arrows (lib/arrow-grid.mjs), set at
// the same places across the cell, each as long as it is there. Every arrow turns to point at the
// pointer wherever it is on the screen, easing round (and the long way never, always the short
// way) so the whole field swings together with the mouse. While there is no pointer to follow the
// arrows rest in the directions they have in the supplied picture.
const SIZE = 0.55 // the arrows are drawn at this share of the length they have in the supplied picture
const EASE = 0.14 // seconds an arrow takes to cover most of a turn
const RESTING = 6 // seconds without the pointer moving before the arrows settle back

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
    let last = performance.now()
    let pointer = null // where the pointer is, in the cell's own pixels
    let movedAt = -1e9
    const turned = ARROW_GRID.map(([, , angle]) => angle)

    const fit = () => {
      const box = root.getBoundingClientRect()
      const ratio = Math.min(3, (window.devicePixelRatio || 1) * 2)
      width = box.width
      height = box.height
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(root)
    fit()

    const onMove = (event) => {
      const box = root.getBoundingClientRect()
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top }
      movedAt = performance.now()
    }
    const onLeave = () => {
      movedAt = -1e9
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    const draw = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const follow = pointer && now - movedAt < RESTING * 1000 && !reduced
      const ratio = canvas.width / Math.max(1, width)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      context.lineCap = 'round'
      context.fillStyle = '#0d0d0d'
      context.strokeStyle = '#0d0d0d'
      const line = Math.max(0.4, height * 0.0034)
      const k = 1 - Math.exp(-dt / EASE)
      ARROW_GRID.forEach(([fx, fy, rest, fl], index) => {
        const cx = fx * width
        const cy = fy * height
        const target = follow ? Math.atan2(pointer.y - cy, pointer.x - cx) : rest
        let turn = target - turned[index]
        while (turn > Math.PI) turn -= Math.PI * 2
        while (turn < -Math.PI) turn += Math.PI * 2
        turned[index] += turn * k
        const angle = turned[index]
        const length = fl * height * SIZE
        const ux = Math.cos(angle)
        const uy = Math.sin(angle)
        const tailX = cx - (ux * length) / 2
        const tailY = cy - (uy * length) / 2
        const headX = cx + (ux * length) / 2
        const headY = cy + (uy * length) / 2
        const size = Math.max(1.4, length * 0.26)
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
      })
      if (!reduced) frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return h(
    'div',
    { ref: rootRef, className: 'fgraph-root' },
    h('img', { className: 'fgraph-img', src: assetPath('panels/arrows-grid.webp'), alt: '', draggable: false }),
    h('canvas', { ref: canvasRef, className: 'fgraph-canvas', role: 'img', 'aria-label': '마우스를 가리키는 화살표들' })
  )
}
