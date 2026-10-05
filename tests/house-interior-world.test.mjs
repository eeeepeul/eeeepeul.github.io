import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HouseInteriorWorld } from '../components/site/HouseInteriorWorld.mjs'

const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

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

test('keeps the pixel canvas behind characters with a crisp rendering fallback', () => {
  const html = renderToStaticMarkup(
    createElement(HouseInteriorWorld, { activeCharacterId: null, characterIds: ['npc-1'] })
  )
  assert.match(html, /class="house-interior-tilemap"[\s\S]*class="house-interior-pixel-canvas"/)
  assert.match(html, /class="house-interior-character-layer"/)
  assert.match(globalStyles, /\.house-interior-pixel-canvas\s*\{[\s\S]*width:\s*100%;[\s\S]*height:\s*100%;[\s\S]*object-fit:\s*fill;[\s\S]*image-rendering:\s*pixelated;[\s\S]*pointer-events:\s*none;/)
  assert.match(globalStyles, /\.house-interior-tilemap\[data-pixel-ready='true'\]\s+\.house-interior-map-layer--floor/)
  assert.doesNotMatch(globalStyles, /\.house-interior-map-layer--floor,\s*\.house-interior-map-layer--walls,\s*\.house-interior-map-layer--doors_windows,\s*\.house-interior-map-layer--furniture,\s*\.house-interior-map-layer--decor\s*\{\s*display:\s*none;/)
})

test('the custom route crops a covering 4:3 camera world instead of squeezing it', () => {
  assert.match(
    globalStyles,
    /\.experience-shell:has\(\.pixel-custom-sidebar\) \.house-interior-camera-viewport\s*\{[^}]*container-type:\s*size;/s
  )
  assert.match(
    globalStyles,
    /\.experience-shell:has\(\.pixel-custom-sidebar\) \.house-interior-camera-world\s*\{[^}]*width:\s*max\(278\.260869565cqi,\s*376\.470588235cqb\);[^}]*height:\s*auto;[^}]*aspect-ratio:\s*4\s*\/\s*3;/s
  )
})
