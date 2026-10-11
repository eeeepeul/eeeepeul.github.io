'use client'

import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { GLOBE, getFacingRotation } from '../../lib/deep-zoom-map.mjs'

const SIZE = 272
const TEXTURE_WIDTH = 2048
const TEXTURE_HEIGHT = 1024
const RAD = Math.PI / 180

// How far the main view has zoomed in, 0 (whole planet) to 1 (the last frame).
function readZoom(root) {
  const growth = Number(root.dataset.mapGrowth) || 0
  const progress = Number(root.dataset.mapProgress) || 0
  const mode = root.dataset.mapMode
  const pixels =
    mode === 'video' || mode === 'aligning' ? 2800 / 2.4 + progress * 2800 : growth * (2800 / 2.4)
  return Math.min(1, Math.max(0, pixels / (2800 + 2800 / 2.4)))
}

// A small globe in white lines on grey, turned the same way as the main globe, with a
// box for the area the main view looks at.
export function MapMiniGlobe() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return undefined

    let cancelled = false
    let lines = null
    let lastKey = ''
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      const offscreen = document.createElement('canvas')
      offscreen.width = TEXTURE_WIDTH
      offscreen.height = TEXTURE_HEIGHT
      const offscreenContext = offscreen.getContext('2d', { willReadFrequently: true })
      offscreenContext.drawImage(image, 0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT)
      const { data } = offscreenContext.getImageData(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT)
      lines = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT)
      for (let index = 0; index < lines.length; index += 1) {
        lines[index] = data[index * 4] < 150 ? 1 : 0
      }
      lastKey = ''
    }
    image.src = assetPath(GLOBE.texture.slice(1))

    const draw = (centerLon, centerLat, zoom, showAoi) => {
      const frame = context.createImageData(SIZE, SIZE)
      const pixels = frame.data
      const radius = SIZE * 0.47
      const centre = SIZE / 2
      const sinLat0 = Math.sin(centerLat * RAD)
      const cosLat0 = Math.cos(centerLat * RAD)
      for (let py = 0; py < SIZE; py += 1) {
        for (let px = 0; px < SIZE; px += 1) {
          const offset = (py * SIZE + px) * 4
          const x = (px - centre) / radius
          const y = -(py - centre) / radius
          const rho = Math.hypot(x, y)
          if (rho > 1) {
            pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 205
            pixels[offset + 3] = 255
            continue
          }
          const c = Math.asin(rho)
          const sinC = Math.sin(c)
          const cosC = Math.cos(c)
          const lat = rho < 1e-9 ? centerLat * RAD : Math.asin(cosC * sinLat0 + (y * sinC * cosLat0) / rho)
          const lon =
            centerLon * RAD +
            Math.atan2(x * sinC, rho * cosLat0 * cosC - y * sinLat0 * sinC)
          let u = (((lon / RAD + 180) % 360) + 360) % 360
          u = (u / 360) * TEXTURE_WIDTH
          const v = Math.min(TEXTURE_HEIGHT - 1, Math.max(0, ((90 - lat / RAD) / 180) * TEXTURE_HEIGHT))
          const ink = lines ? lines[(v | 0) * TEXTURE_WIDTH + (u | 0)] : 0
          // a faint graticule every 15 degrees
          const latDeg = lat / RAD
          const lonDeg = (((lon / RAD) % 360) + 360) % 360
          const nearLat = Math.abs(((latDeg + 90) % 15) - (((latDeg + 90) % 15) > 7.5 ? 15 : 0)) < 0.45
          const nearLon = Math.abs((lonDeg % 15) - (lonDeg % 15 > 7.5 ? 15 : 0)) < 0.45 / Math.max(0.2, Math.cos(lat))
          let tone = 176 + 22 * cosC
          if (nearLat || nearLon) tone = 226
          if (ink) tone = 252
          pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = tone
          pixels[offset + 3] = 255
        }
      }
      context.putImageData(frame, 0, 0)
      if (showAoi) {
        const width = radius * 1.5 * Math.exp(-3.4 * zoom)
        const height = width * 0.72
        context.lineWidth = 3
        context.strokeStyle = 'rgba(255,255,255,0.95)'
        context.strokeRect(centre - width / 2, centre - height / 2, width, height)
        context.fillStyle = 'rgba(255,255,255,0.18)'
        context.fillRect(centre - width / 2, centre - height / 2, width, height)
      }
    }

    const tick = () => {
      const root = document.querySelector('.figma-deep-zoom-map')
      if (!root || !lines) return
      let lon = GLOBE.homeLongitude
      let lat = GLOBE.homeLatitude
      if (root.dataset.mapMode === 'globe' || root.dataset.mapMode === 'aligning') {
        const [yaw, pitch] = (root.dataset.mapRotation || '').split(' ').map(Number)
        if (Number.isFinite(yaw) && Number.isFinite(pitch)) {
          lon = -90 - yaw
          lat = pitch
        }
      }
      const zoom = readZoom(root)
      const showAoi = document.body.dataset.mapLayerAoi !== 'off'
      const key = `${lon.toFixed(1)}|${lat.toFixed(1)}|${zoom.toFixed(3)}|${showAoi}`
      if (key === lastKey) return
      lastKey = key
      draw(lon, lat, zoom, showAoi)
    }
    const timer = window.setInterval(tick, 120)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return createElement(
    'section',
    { className: 'map-mini-globe', 'aria-label': '전체 지구본과 보고 있는 영역' },
    createElement('canvas', {
      ref: canvasRef,
      className: 'map-mini-globe__canvas',
      width: SIZE,
      height: SIZE,
      role: 'img',
      'aria-label': '지구본 미니 지도',
    })
  )
}
