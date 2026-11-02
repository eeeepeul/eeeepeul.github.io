import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

import {
  DEEP_ZOOM_CONFIG,
  GLOBE,
  HOME_ROTATION,
  clampLatitude,
  easeInOut,
  getDragDegreesPerPixel,
  getFacingRotation,
  MAP_LEGEND,
  getLegendNumberedOpacity,
  getShortestYawDelta,
  HOUSE_HOTSPOTS,
  ZOOM_VIDEO,
  getCameraState,
  getHotspotCenter,
  setCameraProgress,
} from '../lib/deep-zoom-map.mjs'

const viewport = { width: 1400, height: 800 }

test('the supplied zoom video and its poster ship with the site', () => {
  assert.ok(existsSync(new URL(`../public${ZOOM_VIDEO.src}`, import.meta.url)))
  assert.ok(existsSync(new URL(`../public${ZOOM_VIDEO.poster}`, import.meta.url)))
  assert.ok(ZOOM_VIDEO.durationSeconds > 0)
})

test('the video timeline follows the same normalized zoom progress', () => {
  assert.equal(setCameraProgress(-2, viewport).time, 0)
  const earlyZoom = setCameraProgress(0.2, viewport)
  const lastFrame = setCameraProgress(1, viewport)

  assert.equal(earlyZoom.timelineProgress, 0.2)
  assert.equal(earlyZoom.time, ZOOM_VIDEO.durationSeconds * 0.2)
  assert.equal(lastFrame.timelineProgress, 1)
  assert.equal(lastFrame.time, ZOOM_VIDEO.durationSeconds)
  assert.equal(setCameraProgress(2, viewport).time, ZOOM_VIDEO.durationSeconds)
  assert.equal(setCameraProgress(Number.NaN, viewport).progress, 0)
})

test('the video always covers the viewport and stays centered', () => {
  for (const size of [viewport, { width: 833, height: 674 }, { width: 390, height: 780 }]) {
    const { video } = getCameraState(0.4, size)

    assert.ok(video.left <= 1e-6)
    assert.ok(video.top <= 1e-6)
    assert.ok(video.left + video.width >= size.width - 1e-6)
    assert.ok(video.top + video.height >= size.height - 1e-6)
    assert.ok(Math.abs(video.left + video.width / 2 - size.width / 2) < 1e-6)
    assert.ok(Math.abs(video.top + video.height / 2 - size.height / 2) < 1e-6)
    assert.ok(Math.abs(video.width / video.height - ZOOM_VIDEO.width / ZOOM_VIDEO.height) < 1e-9)
  }
})

test('house hotspots follow the video frame and only unlock at the end', () => {
  assert.equal(getCameraState(0, viewport).hotspotsActive, false)
  assert.equal(getCameraState(DEEP_ZOOM_CONFIG.hotspotProgress - 0.01, viewport).hotspotsActive, false)
  assert.equal(getCameraState(1, viewport).hotspotsActive, true)

  const state = getCameraState(1, viewport)
  assert.equal(HOUSE_HOTSPOTS.length, 4)
  for (const hotspot of HOUSE_HOTSPOTS) {
    const center = getHotspotCenter(state, hotspot)
    assert.ok(center.x > 0 && center.x < viewport.width)
    assert.ok(center.y > 0 && center.y < viewport.height)
  }
  // The cluster sits near the middle of the last frame.
  const middle = getHotspotCenter(state, HOUSE_HOTSPOTS[1])
  assert.ok(Math.abs(middle.x - viewport.width / 2) < viewport.width * 0.1)
})

test('a 16:9 window shows the whole frame at its own proportions', () => {
  const state = getCameraState(0.5, { width: 1920, height: 1080 })

  assert.equal(state.video.width, 1920)
  assert.equal(state.video.height, 1080)
  assert.equal(state.video.left, 0)
  assert.equal(state.video.top, 0)
})

test('the planet and sky textures ship with the site', () => {
  assert.ok(existsSync(new URL(`../public${GLOBE.texture}`, import.meta.url)))
  assert.ok(existsSync(new URL(`../public${GLOBE.milkyWay.texture}`, import.meta.url)))
  assert.ok(GLOBE.milkyWay.blackLevel >= 0 && GLOBE.milkyWay.blackLevel < 0.2)
  assert.ok(GLOBE.milkyWay.solidRadius >= 0 && GLOBE.milkyWay.solidRadius < 1)
})

test('facing rotation puts a longitude/latitude at the front of the sphere', () => {
  // On a three.js sphere with an equirectangular map, longitude -90 faces the viewer.
  assert.deepEqual(getFacingRotation(-90, 0), { yaw: 0, pitch: 0 })
  assert.deepEqual(getFacingRotation(0, 0), { yaw: -90, pitch: 0 })
  assert.equal(HOME_ROTATION.pitch, GLOBE.homeLatitude)
  assert.equal(HOME_ROTATION.yaw, -90 - GLOBE.homeLongitude)
})

test('yaw turns the shorter way round and tilt is limited', () => {
  assert.equal(getShortestYawDelta(10, 30), 20)
  assert.equal(getShortestYawDelta(350, 10), 20)
  assert.equal(getShortestYawDelta(10, 350), -20)
  assert.equal(getShortestYawDelta(-90, 90), -180)
  assert.equal(clampLatitude(120), GLOBE.maxLatitude)
  assert.equal(clampLatitude(-120), -GLOBE.maxLatitude)
  assert.equal(clampLatitude(12), 12)
})

test('the home turn eases from rest to rest', () => {
  assert.equal(easeInOut(0), 0)
  assert.equal(easeInOut(1), 1)
  assert.equal(easeInOut(0.5), 0.5)
  assert.ok(easeInOut(0.25) < 0.25)
  assert.ok(easeInOut(0.75) > 0.75)
})

test('a drag turns the planet so its surface follows the pointer', () => {
  const small = getDragDegreesPerPixel(GLOBE.minScale)
  const full = getDragDegreesPerPixel(1)

  // One pixel is 1 / (radius * scale) radians, so a smaller planet turns more.
  assert.ok(Math.abs(full - 180 / Math.PI / GLOBE.radius) < 1e-9)
  assert.ok(small > full)
  // A larger on-screen frame means each pixel is a smaller part of the planet.
  assert.ok(getDragDegreesPerPixel(1, 2) < full)
})

test('the sky turns with the planet, as it does in Google Earth', () => {
  assert.equal(GLOBE.skyFollow, 1)
})

test('both map keys ship with the site', () => {
  assert.ok(existsSync(new URL(`../public${MAP_LEGEND.symbols}`, import.meta.url)))
  assert.ok(existsSync(new URL(`../public${MAP_LEGEND.numbered}`, import.meta.url)))
  assert.ok(MAP_LEGEND.width > 0 && MAP_LEGEND.height > 0)
})

test('the keys cross as the planet fills the screen and space disappears', () => {
  // Symbol-only key over space: the globe and the start of the clip.
  assert.equal(getLegendNumberedOpacity(0), 0)
  assert.equal(getLegendNumberedOpacity(MAP_LEGEND.crossFrom), 0)
  // Numbered key once the map fills the screen.
  assert.equal(getLegendNumberedOpacity(MAP_LEGEND.crossTo), 1)
  assert.equal(getLegendNumberedOpacity(1), 1)
  // In between they swap smoothly, never both fully hidden.
  let previous = 0
  for (let step = 0; step <= 40; step += 1) {
    const progress = MAP_LEGEND.crossFrom + ((MAP_LEGEND.crossTo - MAP_LEGEND.crossFrom) * step) / 40
    const numbered = getLegendNumberedOpacity(progress)
    assert.ok(numbered >= previous)
    assert.ok(numbered >= 0 && numbered <= 1)
    previous = numbered
  }
  // The cross happens after the planet has filled the clip's frame (about a third).
  assert.ok(MAP_LEGEND.crossTo >= 0.3)
})
