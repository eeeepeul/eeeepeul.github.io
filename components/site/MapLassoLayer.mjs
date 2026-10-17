'use client'

import { createElement, useEffect, useRef } from 'react'

// A loop drawn with the lasso tool is filled like a coloured-pencil shading: many
// short diagonal strokes in two greens, pressed harder towards the edge, with the
// outline traced over in a darker pencil.
const MIN_LOOP_PIXELS = 60
const CLOSE_GAP_PIXELS = 90

function mulberry(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function smoothPath(points) {
  // Light smoothing so a shaky hand still makes a calm outline.
  if (points.length < 4) return points
  const out = [points[0]]
  for (let i = 1; i < points.length - 1; i += 1) {
    out.push({
      x: (points[i - 1].x + points[i].x * 2 + points[i + 1].x) / 4,
      y: (points[i - 1].y + points[i].y * 2 + points[i + 1].y) / 4,
    })
  }
  out.push(points[points.length - 1])
  return out
}

function tracePath(context, points) {
  context.beginPath()
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y)
    else context.lineTo(point.x, point.y)
  })
  context.closePath()
}

function bounds(points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, minY, maxX, maxY }
}

function distanceToEdge(points, x, y) {
  let best = Infinity
  for (let i = 0; i < points.length; i += 3) {
    const point = points[i]
    best = Math.min(best, Math.hypot(point.x - x, point.y - y))
  }
  return best
}

// Pencil sets: yellow-ish top → cooler bottom, and the outline pencil.
export const LASSO_COLORS = {
  green: { top: [[168, 212, 108], [150, 204, 98], [184, 220, 124]], bottom: [[96, 184, 140], [84, 174, 130], [112, 192, 150]], line: ['#3f8a55', '#2f6f45'], swatch: '#7cc07a' },
  blue: { top: [[150, 200, 232], [136, 190, 228], [170, 210, 238]], bottom: [[88, 130, 206], [78, 120, 200], [104, 144, 214]], line: ['#3a63a8', '#2c4f90'], swatch: '#6a9ad8' },
  pink: { top: [[246, 188, 200], [242, 172, 190], [250, 204, 212]], bottom: [[222, 112, 150], [214, 100, 140], [232, 132, 164]], line: ['#b8456f', '#9a3359'], swatch: '#e88aa8' },
  orange: { top: [[250, 214, 120], [248, 200, 96], [252, 224, 140]], bottom: [[238, 140, 70], [232, 126, 58], [244, 156, 88]], line: ['#c0652a', '#a04f1c'], swatch: '#f0a050' },
  violet: { top: [[200, 186, 232], [188, 172, 226], [212, 200, 238]], bottom: [[130, 100, 196], [118, 88, 188], [144, 116, 206]], line: ['#6a4aa8', '#53378c'], swatch: '#9a82d0' },
}

export function paintPencilShape(context, shape, amount = 1) {
  const points = shape.points
  if (points.length < 3) return
  const random = mulberry(shape.seed)
  const box = bounds(points)
  const size = Math.max(box.maxX - box.minX, box.maxY - box.minY)
  const spacing = Math.max(1.9, Math.min(3.2, size / 160))
  const reach = Math.hypot(box.maxX - box.minX, box.maxY - box.minY)
  context.save()
  tracePath(context, points)
  context.clip()
  context.lineCap = 'round'
  // Two layers of hatching at slightly different angles, lighter green over a
  // yellower one, the way a pencil is gone over twice.
  // Yellow-green at the top of the shape, going to a cooler sea-green at the bottom,
  // as in the reference drawing.
  const palette = LASSO_COLORS[shape.color] || LASSO_COLORS.green
  const topColors = palette.top
  const bottomColors = palette.bottom
  const colourAt = (t, pick) => {
    const a = topColors[pick % topColors.length]
    const b = bottomColors[pick % bottomColors.length]
    const k = Math.min(1, Math.max(0, (t - 0.25) / 0.5))
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)}, ${Math.round(a[1] + (b[1] - a[1]) * k)}, ${Math.round(a[2] + (b[2] - a[2]) * k)})`
  }
  const layers = [
    { angle: -0.62, alpha: 0.78, width: 2.0, shade: 1 },
    { angle: -0.44, alpha: 0.55, width: 1.6, shade: 0.8 },
  ]
  for (const layer of layers) {
    const cos = Math.cos(layer.angle)
    const sin = Math.sin(layer.angle)
    const centreX = (box.minX + box.maxX) / 2
    const centreY = (box.minY + box.maxY) / 2
    for (let offset = -reach / 2; offset <= reach / 2; offset += spacing) {
      // A hatch line is drawn as a run of short strokes with small gaps.
      let along = -reach / 2
      while (along < reach / 2) {
        const length = 14 + random() * 34
        const jitterAngle = layer.angle + (random() - 0.5) * 0.08
        const jitterOffset = offset + (random() - 0.5) * spacing * 0.9
        const startX = centreX - sin * jitterOffset + cos * along
        const startY = centreY + cos * jitterOffset + sin * along
        const endX = startX + Math.cos(jitterAngle) * length
        const endY = startY + Math.sin(jitterAngle) * length
        // Pressed harder (denser, darker) within a few pixels of the outline.
        const nearEdge = distanceToEdge(points, (startX + endX) / 2, (startY + endY) / 2)
        const press = 1 - Math.min(1, nearEdge / 40) * 0.55
        context.globalAlpha = Math.min(1, layer.alpha * press * (0.55 + random() * 0.7) * amount)
        const along01 = (((startY + endY) / 2) - box.minY) / Math.max(1, box.maxY - box.minY)
        context.strokeStyle = colourAt(along01, Math.floor(random() * 3))
        context.lineWidth = layer.width * (0.7 + random() * 0.7)
        context.beginPath()
        context.moveTo(startX, startY)
        context.lineTo(endX, endY)
        context.stroke()
        along += length * (0.7 + random() * 0.5) + random() * 5
      }
    }
  }
  context.restore()
  // The outline: traced twice with a hand that wanders a little.
  context.save()
  context.lineJoin = 'round'
  context.lineCap = 'round'
  for (let pass = 0; pass < 2; pass += 1) {
    context.globalAlpha = (pass === 0 ? 0.85 : 0.5) * amount
    context.strokeStyle = palette.line[pass]
    context.lineWidth = pass === 0 ? 1.8 : 1.2
    context.beginPath()
    points.forEach((point, index) => {
      const wobble = pass === 0 ? 0 : (random() - 0.5) * 1.6
      const x = point.x + wobble
      const y = point.y + wobble
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.closePath()
    context.stroke()
  }
  context.restore()
}

export function MapLassoLayer({ active, color = 'green' }) {
  const colorRef = useRef(color)
  colorRef.current = color
  const canvasRef = useRef(null)
  const activeRef = useRef(active)
  const shapesRef = useRef([])
  const strokeRef = useRef(null)
  const fadeRef = useRef(null)

  useEffect(() => {
    activeRef.current = active
    const mapRoot = document.querySelector('.figma-deep-zoom-map')
    if (mapRoot) mapRoot.style.cursor = active ? 'crosshair' : ''
    return () => {
      if (mapRoot) mapRoot.style.cursor = ''
    }
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    let rect = { left: 0, top: 0, width: 0, height: 0 }

    const sizeToMap = () => {
      const map = document.querySelector('.figma-deep-zoom-map')
      const box = map ? map.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      rect = { left: box.left, top: box.top, width: box.width, height: box.height }
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.style.left = `${rect.left}px`
      canvas.style.top = `${rect.top}px`
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      canvas.width = Math.round(rect.width * ratio)
      canvas.height = Math.round(rect.height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      redraw()
    }

    const redraw = () => {
      context.clearRect(0, 0, rect.width, rect.height)
      shapesRef.current.forEach((shape, index) => {
        const fading = fadeRef.current && fadeRef.current.index === index
        paintPencilShape(context, shape, fading ? fadeRef.current.amount : 1)
      })
      const stroke = strokeRef.current
      if (stroke && stroke.length > 1) {
        context.save()
        context.lineJoin = 'round'
        context.lineCap = 'round'
        context.strokeStyle = '#111'
        context.globalAlpha = 0.9
        context.lineWidth = 1.6
        context.beginPath()
        stroke.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y)
          else context.lineTo(point.x, point.y)
        })
        context.stroke()
        context.restore()
      }
    }

    const fadeIn = (index) => {
      const start = performance.now()
      const step = (now) => {
        const amount = Math.min(1, (now - start) / 380)
        fadeRef.current = amount < 1 ? { index, amount } : null
        redraw()
        if (amount < 1) window.requestAnimationFrame(step)
      }
      window.requestAnimationFrame(step)
    }

    const inMap = (event) =>
      event.clientX >= rect.left &&
      event.clientX <= rect.left + rect.width &&
      event.clientY >= rect.top &&
      event.clientY <= rect.top + rect.height

    const onDown = (event) => {
      if (!activeRef.current || event.button > 0 || !inMap(event)) return
      if (event.target.closest?.('.map-gis-toolbar, .map-gis-zoombar, .map-gis-info, a, button, input, aside')) return
      // The map must not turn under the pen.
      event.stopPropagation()
      event.preventDefault()
      strokeRef.current = [{ x: event.clientX - rect.left, y: event.clientY - rect.top }]
      redraw()
    }

    const onMove = (event) => {
      const stroke = strokeRef.current
      if (!stroke) return
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const last = stroke[stroke.length - 1]
      if (Math.hypot(x - last.x, y - last.y) < 2) return
      stroke.push({ x, y })
      redraw()
    }

    const onUp = () => {
      const stroke = strokeRef.current
      strokeRef.current = null
      if (!stroke || stroke.length < 8) {
        redraw()
        return
      }
      let length = 0
      for (let i = 1; i < stroke.length; i += 1) {
        length += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y)
      }
      const gap = Math.hypot(stroke[0].x - stroke[stroke.length - 1].x, stroke[0].y - stroke[stroke.length - 1].y)
      const box = bounds(stroke)
      const span = Math.max(box.maxX - box.minX, box.maxY - box.minY)
      // A loop: long enough, and its ends meet (or nearly meet, for a scribble).
      if (length >= MIN_LOOP_PIXELS && gap <= Math.max(CLOSE_GAP_PIXELS, span * 0.35)) {
        shapesRef.current.push({
          points: smoothPath(stroke),
          seed: Math.floor(Math.random() * 1e9),
          color: colorRef.current,
        })
        fadeIn(shapesRef.current.length - 1)
      } else {
        redraw()
      }
    }

    const onKey = (event) => {
      if (!activeRef.current) return
      if (event.key === 'Escape') {
        strokeRef.current = null
        redraw()
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        if (document.activeElement && /input|textarea/i.test(document.activeElement.tagName)) return
        shapesRef.current.pop()
        redraw()
      }
    }

    const onReset = () => {
      shapesRef.current = []
      strokeRef.current = null
      redraw()
    }
    const onUndo = () => {
      shapesRef.current.pop()
      redraw()
    }

    sizeToMap()
    window.addEventListener('resize', sizeToMap)
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onUp, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('map:reset', onReset)
    window.addEventListener('map:lasso-clear', onReset)
    window.addEventListener('map:lasso-undo', onUndo)
    const watcher = new window.ResizeObserver(sizeToMap)
    const map = document.querySelector('.figma-deep-zoom-map')
    if (map) watcher.observe(map)
    return () => {
      window.removeEventListener('resize', sizeToMap)
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('map:reset', onReset)
      window.removeEventListener('map:lasso-clear', onReset)
      window.removeEventListener('map:lasso-undo', onUndo)
      watcher.disconnect()
    }
  }, [])

  return createElement('canvas', {
    ref: canvasRef,
    className: 'map-lasso-layer',
    'aria-hidden': 'true',
    'data-lasso': active ? 'on' : 'off',
    // Switched off, the drawings are hidden (not lost): switch it on to see them again.
    style: { visibility: active ? 'visible' : 'hidden' },
  })
}
