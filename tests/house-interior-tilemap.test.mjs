import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { HouseInteriorTilemap, drawPixelScene } from '../components/site/HouseInteriorTilemap.mjs'
import {
  HOUSE_INTERIOR_PIXEL_PALETTE,
  HOUSE_INTERIOR_PIXEL_RUNS,
  HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT,
  HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH,
} from '../lib/house-interior-pixel-art.mjs'

test('renders a data-driven 64 by 48 tilemap with stable layer names', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))

  assert.match(html, /class="house-interior-tilemap"/)
  assert.match(html, /data-map-width="64"/)
  assert.match(html, /data-map-height="48"/)
  assert.match(html, /data-tile-size="16"/)
  assert.match(
    html,
    /style="left:0%;top:0%;width:1.5625%;height:2.083333333333333%"[^>]*data-tile-id="floor-0-0"/
  )

  for (const layer of [
    'floor',
    'walls',
    'doors_windows',
    'furniture',
    'decor',
    'collision',
    'spawn_points',
  ]) {
    assert.match(html, new RegExp(`data-layer="${layer}"`))
  }
})

test('renders furniture and decor as positioned tile objects instead of hardcoded page markup', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))

  assert.match(html, /data-tile-id="living-rug"/)
  assert.match(html, /data-tile-id="bedroom-bed"/)
  assert.match(html, /data-tile-id="study-bookcase-a"/)
  assert.match(html, /data-tile-id="kitchen-table"/)
  assert.match(html, /data-tile-id="entrance-mat"/)
})

test('keeps collision and spawn layers hidden from the visual preview', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))

  assert.match(html, /data-layer="collision"[^>]*hidden/)
  assert.match(html, /data-layer="spawn_points"[^>]*hidden/)
})

test('renders a code-native pixel canvas instead of a background image', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))

  assert.match(html, /class="house-interior-pixel-canvas"/)
  assert.match(html, /width="1448"/)
  assert.match(html, /height="1086"/)
  assert.match(html, /data-pixel-width="256"/)
  assert.match(html, /data-pixel-height="192"/)
  assert.match(html, /data-pixel-scale="4"/)
  assert.doesNotMatch(html, /house-interior-background-image/)
  assert.doesNotMatch(html, /\/media\/house-interior-plan(?:-hd)?\.png/)
})

test('keeps collision metadata hidden beside the canvas', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))

  assert.match(html, /data-layer="walls"/)
  assert.match(html, /data-layer="collision"[^>]*hidden/)
  assert.match(html, /data-layer="spawn_points"[^>]*hidden/)
})

test('does not redraw source blue pixels inside logical wall cells', () => {
  const rectangles = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect(x, y, width, height) {
      rectangles.push({ color: this.fillStyle, x, y, width, height })
    },
  }

  drawPixelScene(context)

  const sourceBluePixels = HOUSE_INTERIOR_PIXEL_RUNS
    .filter(({ color }) => color === 'blue')
    .reduce((total, { length }) => total + length, 0)
  const paintedSourceBluePixels = rectangles
    .filter(({ color }) => color === HOUSE_INTERIOR_PIXEL_PALETTE.blue)
    .reduce((total, { width, height }) => total + width * height, 0)

  assert.ok(paintedSourceBluePixels < sourceBluePixels)
})

test('draws fine source dots on a higher-resolution backing canvas', () => {
  const transforms = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform(...values) {
      transforms.push(values)
    },
    clearRect() {},
    fillRect() {},
  }

  drawPixelScene(context)

  assert.deepEqual(transforms[0], [1, 0, 0, 1, 0, 0])
  assert.equal(HOUSE_INTERIOR_PIXEL_BUFFER_WIDTH, 1448)
  assert.equal(HOUSE_INTERIOR_PIXEL_BUFFER_HEIGHT, 1086)
})

test('renders every blue role as teal while preserving coral accents', () => {
  const paintedColors = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect() {
      paintedColors.push(this.fillStyle)
    },
  }

  drawPixelScene(context)

  assert.ok(paintedColors.includes(HOUSE_INTERIOR_PIXEL_PALETTE.teal))
  assert.ok(paintedColors.includes(HOUSE_INTERIOR_PIXEL_PALETTE.coral))
  assert.ok(!paintedColors.includes('#1254e8'))
  assert.ok(!paintedColors.includes('#0030eb'))
  assert.ok(!paintedColors.includes(HOUSE_INTERIOR_PIXEL_PALETTE.lightBlue))
})

test('renders soft blue fragments as white negative space', () => {
  const paintedColors = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect() {
      paintedColors.push(this.fillStyle)
    },
  }

  drawPixelScene(context)

  const whitePaintCount = paintedColors.filter(
    (color) => color === HOUSE_INTERIOR_PIXEL_PALETTE.white
  ).length
  assert.ok(whitePaintCount > 1)
})

test('clips procedural patterns to the existing source silhouette', () => {
  const rectangles = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect(x, y, width, height) {
      rectangles.push({ color: this.fillStyle, x, y, width, height })
    },
  }

  drawPixelScene(context)

  assert.ok(!rectangles.some(({ color, x, y, width, height }) =>
    color === HOUSE_INTERIOR_PIXEL_PALETTE.white &&
    x === 566 &&
    y === 453 &&
    width === 22 &&
    height === 22
  ))
})

test('decorates wall lines with regular perpendicular ticks', () => {
  const rectangles = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect(x, y, width, height) {
      rectangles.push({ color: this.fillStyle, x, y, width, height })
    },
  }

  drawPixelScene(context)

  assert.ok(rectangles.some(({ color, width, height }) =>
    color === HOUSE_INTERIOR_PIXEL_PALETTE.wall && width === 1 && height === 5
  ))
  assert.ok(rectangles.some(({ color, width, height }) =>
    color === HOUSE_INTERIOR_PIXEL_PALETTE.wall && width === 5 && height === 1
  ))
})

test('gives the lower living-room rug band a thin white inset', () => {
  const rectangles = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect(x, y, width, height) {
      rectangles.push({ color: this.fillStyle, x, y, width, height })
    },
  }

  drawPixelScene(context)

  assert.ok(rectangles.some(({ color, x, y, width, height }) =>
    color === HOUSE_INTERIOR_PIXEL_PALETTE.white &&
    x === 566 &&
    y === 588 &&
    width === 316 &&
    height === 2
  ))
})

test('confines the living-room rug pattern to a lower band beneath the furniture', () => {
  const rectangles = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect(x, y, width, height) {
      rectangles.push({ color: this.fillStyle, x, y, width, height })
    },
  }

  drawPixelScene(context)

  const colorAt = (pixelX, pixelY) => {
    let color = null
    rectangles.forEach((rectangle) => {
      const isInside =
        pixelX >= rectangle.x &&
        pixelX < rectangle.x + rectangle.width &&
        pixelY >= rectangle.y &&
        pixelY < rectangle.y + rectangle.height
      if (isInside) color = rectangle.color
    })
    return color
  }

  assert.equal(colorAt(604, 460), HOUSE_INTERIOR_PIXEL_PALETTE.white)
  assert.equal(colorAt(604, 596), HOUSE_INTERIOR_PIXEL_PALETTE.blue)
})

test('does not erase living-room furniture with a rectangular white underlay', () => {
  const rectangles = []
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect(x, y, width, height) {
      rectangles.push({ color: this.fillStyle, x, y, width, height })
    },
  }

  drawPixelScene(context)

  assert.ok(!rectangles.some(({ color, x, y, width, height }) =>
    color === HOUSE_INTERIOR_PIXEL_PALETTE.white &&
    x === 634 &&
    y === 498 &&
    width === 181 &&
    height === 90
  ))
})
