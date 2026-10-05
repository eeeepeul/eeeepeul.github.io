import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { FigmaHomeScene } from '../components/site/FigmaHomeScene.mjs'
import { ZOOM_VIDEO } from '../lib/deep-zoom-map.mjs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('home scene renders one custom deep-zoom camera container', () => {
  const html = renderToStaticMarkup(createElement(FigmaHomeScene))

  assert.match(html, /class="figma-home-map-engine figma-deep-zoom-map"/)
  assert.match(html, /data-map-engine="custom-deep-zoom"/)
  assert.match(html, /data-map-camera-api="setCameraProgress"/)
  assert.match(html, /data-map-wheel="bound"/)
  assert.match(html, /data-map-status="loading"/)
  assert.match(html, /data-map-progress="0\.0000"/)
  assert.match(html, /<video[^>]*data-map-video="zoom"/)
  assert.equal((html.match(/<video/g) ?? []).length, 1)
  assert.match(html, /<canvas[^>]*data-map-globe="planet"/)
  assert.match(html, /data-map-house-target="house1"/)
  assert.doesNotMatch(html, /maplibre|openstreetmap|figma-home-map-base|<svg/)
})

test('the zoom video is muted, inline and preloaded so the wheel can scrub it', () => {
  const html = renderToStaticMarkup(createElement(FigmaHomeScene))

  assert.match(html, /<video[^>]*muted/)
  assert.match(html, /<video[^>]*playsInline|<video[^>]*playsinline/i)
  assert.match(html, /<video[^>]*preload="auto"/)
  assert.match(html, new RegExp(`src="${ZOOM_VIDEO.src.replaceAll('/', '\\/')}"`))
  assert.match(html, new RegExp(`poster="${ZOOM_VIDEO.poster.replaceAll('/', '\\/')}"`))
})

test('custom map styling has no MapLibre controls or transition layers', () => {
  assert.doesNotMatch(css, /maplibregl/)
  assert.match(css, /\.figma-deep-zoom-world\s*\{[^}]*transform-origin:\s*0 0/s)
  assert.match(css, /\.figma-deep-zoom-target-hit\s*\{[^}]*left:\s*50%/s)
  assert.doesNotMatch(css, /crossfade|dissolve|raster-fade-duration/)
})
