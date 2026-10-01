import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { FigmaHomeScene } from '../components/site/FigmaHomeScene.mjs'
import { MAP_LEVELS } from '../lib/deep-zoom-map.mjs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('home scene renders one custom deep-zoom camera container', () => {
  const html = renderToStaticMarkup(createElement(FigmaHomeScene))

  assert.match(html, /class="figma-home-map-engine figma-deep-zoom-map"/)
  assert.match(html, /data-map-engine="custom-deep-zoom"/)
  assert.match(html, /data-map-camera-api="setCameraProgress"/)
  assert.match(html, /data-map-wheel="reserved-for-scroll-binding"/)
  assert.match(html, /data-map-status="loading"/)
  assert.match(html, /data-map-progress="0\.0000"/)
  assert.match(html, /data-map-debug="false"/)
  assert.doesNotMatch(html, /figma-deep-zoom-debug/)
  assert.equal((html.match(/data-map-level="level-[0-3]"/g) ?? []).length, 4)
  assert.equal((html.match(/src="\/maps\/level-[0-3]\.png"/g) ?? []).length, 4)
  assert.match(html, /data-map-house-target="house1"/)
  assert.doesNotMatch(html, /maplibre|openstreetmap|figma-home-map-base|<svg/)
})

test('all four registered levels are represented by the rendered layer stack', () => {
  const html = renderToStaticMarkup(createElement(FigmaHomeScene))
  for (const level of MAP_LEVELS) {
    assert.match(html, new RegExp(`data-map-level="${level.id}"`))
    assert.match(html, new RegExp(`src="${level.src.replaceAll('/', '\\/')}"`))
  }
})

test('custom map styling has no MapLibre controls or transition layers', () => {
  assert.doesNotMatch(css, /maplibregl/)
  assert.match(css, /\.figma-deep-zoom-world\s*\{[^}]*transform-origin:\s*0 0/s)
  assert.match(css, /\.figma-deep-zoom-target-hit\s*\{[^}]*left:\s*50%/s)
  assert.doesNotMatch(css, /crossfade|dissolve|raster-fade-duration/)
})
