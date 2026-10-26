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

// A loop drawn with the lasso tool is a soft gradient blur: four colours from the rim to
// the core, feathered at the edge, with the core a little off-centre like a lit bubble.
// The handle on the colour bar slides through a run of palettes, blending between them.
// Each palette: rim, outer ring, inner ring, core.
export const LASSO_PALETTES = [
  [[255, 238, 120], [255, 170, 70], [222, 60, 140], [50, 60, 170]],
  [[255, 196, 70], [250, 112, 60], [198, 30, 120], [40, 10, 70]],
  [[255, 214, 90], [255, 150, 50], [232, 40, 60], [214, 20, 36]],
  [[176, 224, 140], [250, 168, 196], [236, 14, 140], [250, 60, 170]],
  [[130, 200, 100], [40, 176, 204], [50, 84, 176], [84, 22, 96]],
  [[96, 202, 242], [44, 112, 212], [118, 42, 166], [246, 52, 124]],
  [[40, 170, 232], [30, 100, 220], [112, 30, 150], [40, 10, 52]],
  [[204, 236, 246], [172, 152, 222], [132, 42, 152], [52, 10, 72]],
]
export const LASSO_DEFAULT_LEVEL = 0.07
const FIELD_SCALE = 0.35

export function lassoPaletteAt(level) {
  const f = Math.min(1, Math.max(0, level)) * (LASSO_PALETTES.length - 1)
  const i = Math.min(LASSO_PALETTES.length - 2, Math.floor(f))
  const t = f - i
  return LASSO_PALETTES[i].map((colour, k) =>
    colour.map((value, c) => value + (LASSO_PALETTES[i + 1][k][c] - value) * t)
  )
}

const smoothstep = (t) => t * t * (3 - 2 * t)

function paletteLut(level) {
  const stops = lassoPaletteAt(level)
  const lut = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i += 1) {
    const f = (i / 255) * 3
    const k = Math.min(2, Math.floor(f))
    const t = smoothstep(f - k)
    for (let c = 0; c < 3; c += 1) lut[i * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * t
  }
  return lut
}

// How deep inside the loop each point is (0 at the rim, 1 at the core) and how solid the
// paint is there, read from a blurred copy of the loop; the blur also feathers the edge.
function buildField(points) {
  const box = bounds(points)
  const spanX = (box.maxX - box.minX) * FIELD_SCALE
  const spanY = (box.maxY - box.minY) * FIELD_SCALE
  const blur = Math.max(1.5, Math.min(spanX, spanY) * 0.2)
  const pad = Math.ceil(blur * 2.4)
  const w = Math.max(4, Math.ceil(spanX + 2)) + pad * 2
  const h = Math.max(4, Math.ceil(spanY + 2)) + pad * 2
  const left = Math.floor(box.minX) - pad / FIELD_SCALE
  const top = Math.floor(box.minY) - pad / FIELD_SCALE
  const sharp = document.createElement('canvas')
  sharp.width = w
  sharp.height = h
  const sc = sharp.getContext('2d')
  sc.setTransform(FIELD_SCALE, 0, 0, FIELD_SCALE, -left * FIELD_SCALE, -top * FIELD_SCALE)
  sc.fillStyle = '#fff'
  tracePath(sc, points)
  sc.fill()
  const soft = document.createElement('canvas')
  soft.width = w
  soft.height = h
  const bc = soft.getContext('2d')
  bc.filter = `blur(${blur}px)`
  bc.drawImage(sharp, 0, 0)
  const blurred = bc.getImageData(0, 0, w, h).data
  let peak = 0.5
  for (let i = 0; i < w * h; i += 1) peak = Math.max(peak, blurred[i * 4 + 3] / 255)
  const depth = new Uint8Array(w * h)
  const alpha = new Uint8Array(w * h)
  const midX = w / 2
  const midY = h / 2
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x
      const b = blurred[i * 4 + 3] / 255
      // Deepest where the loop is thickest, nudged up and to the left.
      const lean = (-(x - midX) / w - (y - midY) / h) * 0.28
      const d = Math.min(1, Math.max(0, (b - 0.3) / (peak - 0.3) + lean * Math.min(1, b * 1.4)))
      depth[i] = Math.round(255 * d)
      alpha[i] = Math.round(255 * smoothstep(Math.min(1, Math.max(0, (b - 0.1) / 0.5))))
    }
  }
  return { left, top, w, h, depth, alpha, image: null, level: null, canvas: null }
}

export function paintHeatShape(context, shape, amount = 1) {
  if (shape.points.length < 3) return
  if (!shape.field) shape.field = buildField(shape.points)
  const field = shape.field
  const level = shape.level == null ? LASSO_DEFAULT_LEVEL : shape.level
  if (field.level !== level) {
    if (!field.canvas) {
      field.canvas = document.createElement('canvas')
      field.canvas.width = field.w
      field.canvas.height = field.h
      field.image = field.canvas.getContext('2d').createImageData(field.w, field.h)
    }
    const lut = paletteLut(level)
    const data = field.image.data
    for (let i = 0; i < field.w * field.h; i += 1) {
      const k = field.depth[i] * 3
      data[i * 4] = lut[k]
      data[i * 4 + 1] = lut[k + 1]
      data[i * 4 + 2] = lut[k + 2]
      data[i * 4 + 3] = field.alpha[i]
    }
    field.canvas.getContext('2d').putImageData(field.image, 0, 0)
    field.level = level
  }
  context.save()
  context.globalAlpha = amount
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(field.canvas, field.left, field.top, field.w / FIELD_SCALE, field.h / FIELD_SCALE)
  context.restore()
}

export function MapLassoLayer({ active }) {
  const canvasRef = useRef(null)
  const activeRef = useRef(active)
  const shapesRef = useRef([])
  const strokeRef = useRef(null)
  const fadeRef = useRef(null)
  const levelRef = useRef(typeof window !== 'undefined' && window.__mapLassoLevel != null ? window.__mapLassoLevel : LASSO_DEFAULT_LEVEL)

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
      // Placed against whatever it is fixed to (the page, or the cell that holds the map).
      const holder = canvas.offsetParent && canvas.offsetParent !== document.body ? canvas.offsetParent.getBoundingClientRect() : { left: 0, top: 0 }
      canvas.style.left = `${rect.left - holder.left}px`
      canvas.style.top = `${rect.top - holder.top}px`
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
        paintHeatShape(context, shape, fading ? fadeRef.current.amount : 1)
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
      if (event.target.closest?.('.map-gis-toolbar, .map-gis-zoombar, .map-gis-info, .map-gis-scale, a, button, input, aside')) return
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
          level: levelRef.current,
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
    const onLevel = (event) => {
      levelRef.current = event.detail.level
      const last = shapesRef.current[shapesRef.current.length - 1]
      if (last) last.level = event.detail.level
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
    window.addEventListener('map:lasso-level', onLevel)
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
      window.removeEventListener('map:lasso-level', onLevel)
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
