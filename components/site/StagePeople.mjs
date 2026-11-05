'use client'

import { createElement as h, useEffect, useRef } from 'react'
import { PICTURE_HEIGHT, PICTURE_WIDTH, getPlaces, getPrints, trackPeople } from '../../lib/visitor-people.mjs'

// The people coming to the houses, seen from above in the aerial picture of cell 2: the same people as the
// stars of the radar in cell 7 (lib/visitor-people.mjs), each walking to the house it is headed for, and
// gone when it gets there. A person walks as in the drawn walk cycle of ten frames
// (public/media/person-walk.png: 5 columns by 2 rows of 48-pixel frames, in the order of the walk, the person
// walking down the frame), each frame turned to the way the person goes, so the arms and legs really swing.
// A person is a plain black silhouette, small beside the houses (about 24 pixels long, the houses being
// about 110 pixels across in the picture). It is drawn in a sprite of SPRITE pixels, and put on the picture
// magnified without smoothing, so it is a coarse mosaic of square blocks, broken up as a scan is.
// It lies in the same box as the picture, fitted just as it is, so it zooms with it.
const SCALE = 0.75
const SPRITE = 28 // the sprite's side, in its own pixels
const BLOCK = 1.5 // a sprite pixel, in picture pixels
const FRAME = 48 // a frame of the walk, in the sheet's pixels
const SIZE = 20 // how large a frame is drawn in the sprite, in sprite pixels: a person is about 24 picture pixels long
const FRAMES = 10
const COLUMNS = 5
const STEPS_PER_SECOND = 9 // frames of the walk shown in a second
const FRAME_MS = 33
const OPACITY = 0.8 // the people and their footprints are drawn at 80%
const WALK = '/media/person-walk.png'
const WALK_DOWN = Math.PI / 2 // the drawn person walks down the frame

function drawPerson(context, sheet, x, y, heading, step) {
  const frame = ((Math.floor(step) % FRAMES) + FRAMES) % FRAMES
  context.save()
  context.translate(x, y)
  context.rotate(heading - WALK_DOWN)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(sheet, (frame % COLUMNS) * FRAME, Math.floor(frame / COLUMNS) * FRAME, FRAME, FRAME, -SIZE / 2, -SIZE / 2, SIZE, SIZE)
  context.restore()
}

export function StagePeople() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    canvas.width = Math.round(PICTURE_WIDTH * SCALE)
    canvas.height = Math.round(PICTURE_HEIGHT * SCALE)
    const context = canvas.getContext('2d')
    const sprite = document.createElement('canvas')
    sprite.width = SPRITE
    sprite.height = SPRITE
    const spriteContext = sprite.getContext('2d')
    // the people and their footprints are drawn solid on this layer, which is then put on the picture at 80%,
    // so that where a footprint and a person overlap it is still 80%, not darker
    const layer = document.createElement('canvas')
    layer.width = canvas.width
    layer.height = canvas.height
    const layerContext = layer.getContext('2d')
    context.imageSmoothingEnabled = false
    const sheet = new Image()
    let ready = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = 0

    const paint = (now) => {
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      if (!ready) return
      layerContext.setTransform(SCALE, 0, 0, SCALE, 0, 0)
      layerContext.clearRect(0, 0, PICTURE_WIDTH, PICTURE_HEIGHT)
      trackPeople(now)
      // the footprints the people leave behind them, oldest first (they go in the order they were made): the
      // same black as the people, each a few square blocks of the mosaic along the way
      layerContext.fillStyle = '#000'
      getPrints(now).forEach((print) => {
        if (print.alpha <= 0) return
        layerContext.globalAlpha = print.alpha
        const stepX = Math.round(Math.cos(print.heading))
        const stepY = Math.round(Math.sin(print.heading))
        const x0 = Math.round(print.x / BLOCK)
        const y0 = Math.round(print.y / BLOCK)
        for (let k = -1; k <= 1; k += 1) {
          layerContext.fillRect((x0 + stepX * k) * BLOCK, (y0 + stepY * k) * BLOCK, BLOCK, BLOCK)
        }
      })
      getPlaces().forEach((person) => {
        if (person.alpha <= 0.02) return
        // only what is in (or at the edge of) the picture
        const reach = SPRITE * BLOCK
        if (person.x < -reach || person.x > PICTURE_WIDTH + reach || person.y < -reach || person.y > PICTURE_HEIGHT + reach) return
        // each person is at their own point of the walk, from the clock and their own number
        spriteContext.setTransform(1, 0, 0, 1, 0, 0)
        spriteContext.clearRect(0, 0, SPRITE, SPRITE)
        drawPerson(spriteContext, sheet, SPRITE / 2, SPRITE / 2, person.heading, (now / 1000) * STEPS_PER_SECOND + person.id * 3)
        layerContext.globalAlpha = person.alpha
        layerContext.imageSmoothingEnabled = false
        layerContext.drawImage(sprite, person.x - (SPRITE * BLOCK) / 2, person.y - (SPRITE * BLOCK) / 2, SPRITE * BLOCK, SPRITE * BLOCK)
      })
      layerContext.globalAlpha = 1
      context.globalAlpha = OPACITY
      context.drawImage(layer, 0, 0)
      context.globalAlpha = 1
    }

    const loop = (now) => {
      frame = window.requestAnimationFrame(loop)
      if (now - last < FRAME_MS) return
      last = now
      paint(now)
    }

    sheet.onload = () => {
      ready = true
      paint(0)
    }
    sheet.src = WALK
    if (!reduced) frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return h('canvas', { ref: canvasRef, className: 'scale-cell__visits', 'aria-hidden': 'true' })
}
