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
  getGlobeScale,
  getHandoffOpacity,
  MAP_LEGEND,
  getLegendNumberedOpacity,
  getStarsAmount,
  getVideoHandoffProgress,
  getVideoLimbRatio,
  getVideoPlanetScale,
  isVideoFrameReady,
  isVideoSeekCurrent,
  shouldRequestVideoSeek,
  getZoomAnchorTurn,
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

test('handoff progress never runs ahead of the decoded video frame', () => {
  assert.equal(getVideoHandoffProgress(0.2, 0), 0)
  assert.equal(getVideoHandoffProgress(0.2, ZOOM_VIDEO.durationSeconds * 0.1), 0.1)
  assert.equal(getVideoHandoffProgress(0.2, ZOOM_VIDEO.durationSeconds * 0.2), 0.2)
  assert.equal(getVideoHandoffProgress(0.2, ZOOM_VIDEO.durationSeconds * 0.4), 0.2)
  assert.equal(getVideoHandoffProgress(0.2, Number.NaN), 0)
})

test('a decoded frame can be checked against the requested timestamp', () => {
  assert.equal(isVideoFrameReady(0, 0), true)
  assert.equal(isVideoFrameReady(0.2, 0), false)
  assert.equal(isVideoFrameReady(0.2, ZOOM_VIDEO.durationSeconds * 0.2), true)
  assert.equal(isVideoFrameReady(0.2, ZOOM_VIDEO.durationSeconds * 0.2 + 0.01), true)
  assert.equal(isVideoFrameReady(0.2, ZOOM_VIDEO.durationSeconds * 0.2 + 0.03), false)
})

test('late seek events cannot repaint an obsolete video frame', () => {
  assert.equal(isVideoSeekCurrent(2, 2), true)
  assert.equal(isVideoSeekCurrent(2, 2.01), true)
  assert.equal(isVideoSeekCurrent(2, 2.03), false)
  assert.equal(isVideoSeekCurrent(2, 2.03, 1 / 24), true)
  assert.equal(isVideoSeekCurrent(2, Number.NaN), false)
})

test('video seeks are skipped when the decoder is already on the requested frame', () => {
  assert.equal(shouldRequestVideoSeek(2, 2), false)
  assert.equal(shouldRequestVideoSeek(2, 2.01), false)
  assert.equal(shouldRequestVideoSeek(2, 2.03), true)
  assert.equal(shouldRequestVideoSeek(Number.NaN, 2), false)
})

test('the original 3D background only leads the first reference frames', () => {
  assert.equal(setCameraProgress(0.01, viewport).backgroundPinned, true)
  assert.equal(setCameraProgress(0.02, viewport).backgroundPinned, true)
  assert.equal(setCameraProgress(0.35, viewport).backgroundPinned, true)
  assert.equal(setCameraProgress(0.41, viewport).backgroundPinned, false)
})

test('the globe stays visible until its rim leaves the viewport, then blends into the clip', () => {
  for (const progress of [0, 0.005, 0.01, GLOBE.handoffStart]) {
    assert.equal(getHandoffOpacity(progress), 1)
  }
  assert.ok(getHandoffOpacity(0.395) > 0 && getHandoffOpacity(0.395) < 1)
  assert.equal(getHandoffOpacity(GLOBE.handoffEnd), 0)
  assert.equal(getHandoffOpacity(0.41), 0)
  assert.equal(getHandoffOpacity(1), 0)
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

test('the planet grows exponentially from a small start to the clip size', () => {
  assert.equal(getGlobeScale(0), GLOBE.minScale)
  assert.equal(getGlobeScale(1), 1)
  assert.equal(getGlobeScale(-3), GLOBE.minScale)
  assert.equal(getGlobeScale(4), 1)
  assert.ok(Math.abs(getGlobeScale(0.5) - Math.sqrt(GLOBE.minScale)) < 1e-9)
  assert.ok(GLOBE.minScale > 0 && GLOBE.minScale < 1)
  assert.ok(GLOBE.starCount > 0)
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

test('zooming towards the pointer turns the planet to keep that point in place', () => {
  const point = { x: 120, y: -60 }
  const grow = getZoomAnchorTurn(point, 0.5, 0.6)
  const shrink = getZoomAnchorTurn(point, 0.6, 0.5)

  // Centre pointer: nothing to anchor. Off the planet: nothing to anchor.
  assert.equal(getZoomAnchorTurn({ x: 0, y: 0 }, 0.5, 0.6), null)
  assert.equal(getZoomAnchorTurn({ x: 400, y: 0 }, 0.5, 0.6), null)
  // Growing pulls the point back towards the centre: left and down here.
  assert.ok(grow.yaw < 0 && grow.pitch > 0)
  // Shrinking is the exact opposite turn.
  assert.ok(Math.abs(grow.yaw + shrink.yaw) < 1e-9)
  assert.ok(Math.abs(grow.pitch + shrink.pitch) < 1e-9)
  // The turn follows the direction of the pointer from the centre.
  assert.ok(Math.abs(grow.yaw / grow.pitch - point.x / point.y) < 1e-9)
})

test('the sky turns with the planet, as it does in Google Earth', () => {
  assert.equal(GLOBE.skyFollow, 1)
})

test('the 3D planet follows the clip planet in size while the camera pushes in', () => {
  // Starts at the clip's first frame size and never shrinks while the clip plays on.
  assert.equal(getVideoPlanetScale(0), 1)
  let previous = 1
  for (let step = 1; step <= 40; step += 1) {
    const scale = getVideoPlanetScale(step / 100)
    assert.ok(scale >= previous)
    previous = scale
  }
  // Measured on the clip: about 1.6x by 21% of the way through.
  assert.ok(Math.abs(getVideoPlanetScale(0.2074) - 1.687) < 1e-9)
  // Interpolates between the measured points.
  const between = getVideoPlanetScale(0.0916)
  assert.ok(between > getVideoPlanetScale(0.0824) && between < getVideoPlanetScale(0.1008))
})

test('the fully opaque 3D planet only covers the supplied reference lead-in', () => {
  const earlyScale = getVideoPlanetScale(0.01)
  const lateScale = getVideoPlanetScale(0.02)

  assert.equal(getHandoffOpacity(0.01), 1)
  assert.equal(getHandoffOpacity(0.28), 1)
  assert.ok(getHandoffOpacity(0.34) > 0)
  assert.equal(getHandoffOpacity(0.4), 0)
  assert.ok(lateScale > earlyScale)
  assert.equal(GLOBE.handoffEnd, GLOBE.backgroundEnd)
  assert.ok(getVideoPlanetScale(GLOBE.handoffEnd) > 1)
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

test('the 3D planet rim is squeezed onto the clip rim while the land stays put', () => {
  assert.equal(getVideoLimbRatio(0), 1)
  for (let step = 0; step <= 10; step += 1) {
    const ratio = getVideoLimbRatio((step / 10) * 0.1)
    assert.ok(ratio <= 1 && ratio > 0.9)
  }
})

test('the sky stars stay over the clip while there is sky, then go', () => {
  assert.equal(getStarsAmount(0), 1)
  assert.equal(getStarsAmount(0.35), 1)
  assert.equal(getStarsAmount(0.52), 0)
  assert.equal(getStarsAmount(1), 0)
})
