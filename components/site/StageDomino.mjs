'use client'

import { createElement as h, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// Cell 16: seventeen tiles in a row, filling the box to its right edge (the box is as wide as 11 and 17 above and below), each one running through the same supplied frames (the first
// eleven of the twelve, which are the ones with a picture, with a blended frame between each pair:
// 21 in all, side by side in public/media/domino-16.webp). Every tile starts a little after the one
// before it, so the movement goes along the row one tile after another, like dominoes, and then
// runs back the same way. It is drawn on a canvas so that every tile has exactly the same whole-
// pixel width and each picture sits exactly between its two divider lines. A grain of fine
// light specks lies over the whole box, like dust or drizzle: a few small sheets of scattered one-pixel
// dots (a third of a screen pixel wide), white and of every strength, changed about twelve times a second (held still when movement
// is switched off).
const TILES = 17
const FRAMES = 21
const FRAME_W = 120
const FRAME_H = 100
const RUN = 2.4 // seconds for the frames to run from the first to the last
const LAG = 0.16 // seconds between one tile and the next
const GRAIN_SHEETS = 5 // different sheets of grain, shown in turn
const GRAIN_SIZE = 160 // pixels on a side of one sheet
const GRAIN_SCALE = 3 // the box is drawn at three times the screen's own pixels, so a speck is a third of a pixel
const GRAIN_DENSITY = 0.18 // the share of pixels that carry a speck
const GRAIN_OPACITY = 0.5 // how opaque the grain is overall (50%)
const GRAIN_RATE = 12 // changes of grain a second

export function StageDomino() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sprite = new Image()
    let ready = false
    let frame = 0
    let width = 0
    let height = 0
    let ratio = 1
    const grains = []

    const fit = () => {
      const box = canvas.getBoundingClientRect()
      ratio = Math.min(3, window.devicePixelRatio || 1) * GRAIN_SCALE
      width = Math.max(1, Math.round(box.width * ratio))
      height = Math.max(1, Math.round(box.height * ratio))
      canvas.width = width
      canvas.height = height
    }
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    fit()

    // the sheets of grain: here and there a pixel of light, the rest clear
    for (let n = 0; n < GRAIN_SHEETS; n += 1) {
      const sheet = document.createElement('canvas')
      sheet.width = GRAIN_SIZE
      sheet.height = GRAIN_SIZE
      const sheetContext = sheet.getContext('2d')
      const picture = sheetContext.createImageData(GRAIN_SIZE, GRAIN_SIZE)
      for (let i = 0; i < picture.data.length; i += 4) {
        const speck = Math.random() < GRAIN_DENSITY
        picture.data[i] = 255
        picture.data[i + 1] = 252
        picture.data[i + 2] = 246
        picture.data[i + 3] = speck ? Math.floor(120 + Math.random() * 135) : 0
      }
      sheetContext.putImageData(picture, 0, 0)
      grains.push(context.createPattern(sheet, 'repeat'))
    }

    const draw = (now) => {
      if (ready) {
        context.clearRect(0, 0, width, height)
        const time = reduced ? 0 : now / 1000
        for (let i = 0; i < TILES; i += 1) {
          const left = Math.round((i * width) / TILES)
          const right = Math.round(((i + 1) * width) / TILES)
          // its place in the run: waiting for its turn, then forwards, then back, and so on
          const t = time - i * LAG
          let progress = 0
          if (t > 0) {
            const u = (t % (2 * RUN)) / RUN
            progress = u <= 1 ? u : 2 - u
          }
          const index = Math.round(progress * (FRAMES - 1))
          context.drawImage(sprite, index * FRAME_W, 0, FRAME_W, FRAME_H, left, 0, right - left, height)
          if (i < TILES - 1) {
            // a hair-fine divider: one screen pixel, and faint
            context.fillStyle = 'rgba(20, 30, 50, 0.4)'
            context.fillRect(right - GRAIN_SCALE, 0, GRAIN_SCALE, height)
          }
        }
        // the grain, over everything: the next sheet, moved to a new spot each time
        const sheet = reduced ? 0 : Math.floor((now / 1000) * GRAIN_RATE) % GRAIN_SHEETS
        context.save()
        context.globalAlpha = GRAIN_OPACITY
        context.translate(-((sheet * 37) % GRAIN_SIZE), -((sheet * 61) % GRAIN_SIZE))
        context.fillStyle = grains[sheet]
        context.fillRect(0, 0, width + GRAIN_SIZE, height + GRAIN_SIZE)
        context.restore()
      }
      if (!reduced) frame = window.requestAnimationFrame(draw)
    }

    sprite.onload = () => {
      ready = true
      frame = window.requestAnimationFrame(draw)
    }
    sprite.src = assetPath('media/domino-16.webp')

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return h('canvas', { ref: canvasRef, className: 'domino', role: 'img', 'aria-label': '차례로 움직이는 17개의 칸' })
}
