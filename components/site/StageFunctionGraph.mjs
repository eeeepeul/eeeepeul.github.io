'use client'

import { createElement as h, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { arrowField, ARROW_SCATTER } from '../../lib/arrow-field.mjs'

// Cell 10: the supplied field picture (a grid of curves) with its own arrows rubbed out of
// public/panels/arrows-grid.webp, filling the cell edge to edge. Over it a field of arrows is drawn
// as in the supplied vector-field picture: the same arrows (lib/arrow-grid.mjs), at the same places
// and as long as they are there, each with a thin shaft and a small barbed head.
//
// On their own the arrows blow along like wind, never standing still: every one lies along the
// swirling field of the supplied picture, which itself swings to and fro in gusts that pass across
// the cell, and bends along the field, so the shafts are gentle curves that shift as the field moves
// (lib/arrow-field.mjs), while each arrow glides on in the way it points (see below). As soon as the pointer is over the cell, every
// arrow straightens and turns to point at it; when the pointer leaves, they flow again.
//
// The arrows are a little shorter than they are in the supplied picture, with the long tail and the
// clear small head they have there, and they stand scattered, thick in some places and thin in
// others (lib/arrow-field.mjs), and each one has a direction it
// travels in, slowly: its head comes out first, ahead of where it was, the shaft grows out behind
// it, the whole arrow glides along its line, and then the head fades away in front while the tail
// catches up behind, and it starts again from the back. No two are at the same point of this at
// once, so the field is always full of arrows being born at the tail and dying at the head.
const EASE = 0.14 // seconds an arrow takes to cover most of a turn
const SIZE = 0.78 // the length of an arrow against the length it has in the supplied picture
const GLIDE = 1.8 // how far an arrow travels along its line in one round, in its own lengths
const SEGMENTS = 7 // pieces of a curved shaft

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
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
    let last = performance.now()
    let pointer = null // the pointer in the cell's own pixels, only while it is over the cell
    const turned = ARROW_SCATTER.map(([x, y]) => arrowField(x, y, 0))
    const bent = ARROW_SCATTER.map(() => 0)

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
      const x = event.clientX - box.left
      const y = event.clientY - box.top
      pointer = x >= 0 && y >= 0 && x <= box.width && y <= box.height ? { x, y } : null
    }
    const onLeave = () => {
      pointer = null
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    const wrap = (turn) => {
      let value = turn
      while (value > Math.PI) value -= Math.PI * 2
      while (value < -Math.PI) value += Math.PI * 2
      return value
    }

    const draw = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const time = reduced ? 0 : now / 1000
      const ratio = canvas.width / Math.max(1, width)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.fillStyle = '#0d0d0d'
      context.strokeStyle = '#0d0d0d'
      // the arrow as drawn in the supplied picture, at half its size: a thin shaft, and a small
      // barbed head of one size for every arrow; all of it in proportion to the height of the picture
      const shaft = Math.max(0.45, height * 0.0042)
      const headLength = Math.max(2.8, height * 0.0185)
      const headHalf = headLength * 0.42
      const k = 1 - Math.exp(-dt / EASE)
      const follow = pointer && !reduced

      ARROW_SCATTER.forEach(([fx, fy, , fl], index) => {
        const cx = fx * width
        const cy = fy * height
        const length = Math.max(fl * height * SIZE, headLength * 3)
        // where the arrow wants to point, and how much it wants to bend, in the flow
        let target
        let bend
        if (follow) {
          target = Math.atan2(pointer.y - cy, pointer.x - cx)
          bend = 0
        } else {
          target = arrowField(fx, fy, time)
          // the field a little behind and a little ahead along the arrow tells how it curves
          const reach = (length / height) * 0.5
          const back = arrowField(fx - Math.cos(target) * reach, fy - Math.sin(target) * reach, time)
          const ahead = arrowField(fx + Math.cos(target) * reach, fy + Math.sin(target) * reach, time)
          bend = Math.max(-0.9, Math.min(0.9, wrap(ahead - back)))
        }
        turned[index] += wrap(target - turned[index]) * k
        bent[index] += (bend - bent[index]) * k
        const angle = turned[index]
        const curve = bent[index]

        // its round: where it is in being born, gliding and fading
        const period = 3.4 + ((index * 0.37) % 1) * 2.6
        const round = reduced ? 0.5 : (((time / period + ((index * 0.618) % 1)) % 1) + 1) % 1
        const grow = smooth(0, 0.2, round) * (1 - smooth(0.8, 1, round))
        const shown = length * (0.5 + 0.5 * grow)
        const glide = length * GLIDE
        const headAt = glide * (round - 0.5) // how far the head is along the line from the middle
        const tailAt = headAt - shown
        const fade = Math.min(1, round / 0.1, (1 - round) / 0.1)
        if (fade <= 0.02) return

        // a point on the shaft's line, s along it from the middle (a gentle arc as the field bends)
        const at = (along) => {
          const theta = angle + (curve * along) / length
          if (Math.abs(curve) < 1e-3) return [cx + Math.cos(angle) * along, cy + Math.sin(angle) * along, theta]
          const r = length / curve
          return [cx + r * (Math.sin(theta) - Math.sin(angle)), cy - r * (Math.cos(theta) - Math.cos(angle)), theta]
        }
        const [headX, headY, headAngle] = at(headAt)
        const ux = Math.cos(headAngle)
        const uy = Math.sin(headAngle)
        const nx = -uy
        const ny = ux
        const backX = headX - ux * headLength
        const backY = headY - uy * headLength
        const notchX = headX - ux * headLength * 0.72
        const notchY = headY - uy * headLength * 0.72
        context.globalAlpha = fade
        context.lineWidth = shaft
        context.beginPath()
        for (let step = 0; step <= SEGMENTS; step += 1) {
          const [x, y] = at(tailAt + ((headAt - headLength * 0.72 - tailAt) * step) / SEGMENTS)
          if (step === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.stroke()
        context.beginPath()
        context.moveTo(headX, headY)
        context.lineTo(backX + nx * headHalf, backY + ny * headHalf)
        context.lineTo(notchX, notchY)
        context.lineTo(backX - nx * headHalf, backY - ny * headHalf)
        context.closePath()
        context.fill()
      })
      context.globalAlpha = 1
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
    h('canvas', { ref: canvasRef, className: 'fgraph-canvas', role: 'img', 'aria-label': '흐르다가 마우스를 가리키는 화살표들' })
  )
}
