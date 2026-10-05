import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

import {
  DEEP_ZOOM_CONFIG,
  GLOBE,
  HOME_ROTATION,
  clampLatitude,
  easeInOut,
  getFacingRotation,
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

test('progress maps linearly onto the video timeline and is clamped', () => {
  assert.equal(setCameraProgress(-2, viewport).time, 0)
  assert.equal(setCameraProgress(0.5, viewport).time, ZOOM_VIDEO.durationSeconds / 2)
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

test('the planet texture ships with the site', () => {
  assert.ok(existsSync(new URL(`../public${GLOBE.texture}`, import.meta.url)))
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
