import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { HouseInteriorTilemap } from '../components/site/HouseInteriorTilemap.mjs'

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
  assert.match(html, /data-pixel-width="256"/)
  assert.match(html, /data-pixel-height="192"/)
  assert.doesNotMatch(html, /house-interior-background-image/)
  assert.doesNotMatch(html, /\/media\/house-interior-plan(?:-hd)?\.png/)
})

test('keeps collision metadata hidden beside the canvas', () => {
  const html = renderToStaticMarkup(createElement(HouseInteriorTilemap))

  assert.match(html, /data-layer="walls"/)
  assert.match(html, /data-layer="collision"[^>]*hidden/)
  assert.match(html, /data-layer="spawn_points"[^>]*hidden/)
})
