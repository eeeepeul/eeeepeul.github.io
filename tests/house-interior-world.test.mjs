import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HouseInteriorWorld } from '../components/site/HouseInteriorWorld.mjs'

test('keeps tilemap and characters inside one camera world focused on living room', () => {
  const html = renderToStaticMarkup(
    createElement(HouseInteriorWorld, { activeCharacterId: null, characterIds: ['npc-1'] })
  )
  assert.match(html, /class="house-interior-camera-viewport"/)
  assert.match(html, /class="house-interior-camera-world"[^>]*data-camera-mode="living-room"/)
  assert.match(
    html,
    /class="house-interior-camera-world"[\s\S]*class="house-interior-tilemap"[\s\S]*class="house-interior-character-layer"/
  )
  assert.match(html, /data-camera-focus="31:24"/)
})
