import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEEP_ZOOM_CONFIG,
  HOUSE_BOUNDS,
  MAP_LEVELS,
  getActiveLevel,
  getCameraState,
  getLevelRegistration,
  setCameraProgress,
} from '../lib/deep-zoom-map.mjs'

test('registers four supplied map levels in one normalized world space', () => {
  assert.deepEqual(
    MAP_LEVELS.map(({ id, src }) => ({ id, src })),
    [
      { id: 'level-0', src: '/maps/level-0.png' },
      { id: 'level-1', src: '/maps/level-1.png' },
      { id: 'level-2', src: '/maps/level-2.png' },
      { id: 'level-3', src: '/maps/level-3.png' },
    ]
  )
  for (const level of MAP_LEVELS) {
    assert.ok(level.registrationScale > 0)
    assert.ok(level.targetX >= 0 && level.targetX <= 1)
    assert.ok(level.targetY >= 0 && level.targetY <= 1)
    assert.ok(level.startZoom <= level.endZoom)
    assert.ok(Math.abs(level.worldTargetX - 0.5) < 1e-9)
    assert.ok(Math.abs(level.worldTargetY - 0.5) < 1e-9)
  }
})

test('house bounds center is the final target cluster, not one building', () => {
  assert.ok(HOUSE_BOUNDS.width > 0.1)
  assert.ok(HOUSE_BOUNDS.height > 0.1)
  assert.ok(Math.abs(HOUSE_BOUNDS.targetX - (HOUSE_BOUNDS.x + HOUSE_BOUNDS.width / 2)) < 1e-9)
  assert.ok(Math.abs(HOUSE_BOUNDS.targetY - (HOUSE_BOUNDS.y + HOUSE_BOUNDS.height / 2)) < 1e-9)
})

test('camera keeps the registered target at viewport center for every progress value', () => {
  for (const progress of [0, 0.17, 0.49, 0.76, 1]) {
    const state = getCameraState(progress, { width: 833, height: 674 })
    assert.ok(Math.abs(state.targetScreen.x - 833 / 2) < 1e-6)
    assert.ok(Math.abs(state.targetScreen.y - 674 / 2) < 1e-6)
    assert.ok(state.scale >= DEEP_ZOOM_CONFIG.initialScale)
    assert.ok(state.scale <= DEEP_ZOOM_CONFIG.finalScale)
  }
})

test('camera scale grows exponentially while progress is clamped', () => {
  const start = setCameraProgress(-2, { width: 100, height: 100 })
  const middle = setCameraProgress(0.5, { width: 100, height: 100 })
  const end = setCameraProgress(2, { width: 100, height: 100 })

  assert.equal(start.progress, 0)
  assert.equal(end.progress, 1)
  assert.ok(start.scale < middle.scale)
  assert.ok(middle.scale < end.scale)
  assert.equal(getActiveLevel(0).id, 'level-0')
  assert.equal(getActiveLevel(1).id, 'level-3')
})

test('camera keeps one continuously increasing scale independent of the LOD level', () => {
  const states = [0, 0.24, 0.5, 0.76, 1].map((progress) =>
    getCameraState(progress, { width: 833, height: 674 })
  )

  assert.deepEqual(
    states.map((state) => state.cameraScale),
    states.map((state) => state.scale)
  )
  for (let index = 1; index < states.length; index += 1) {
    assert.ok(states[index].cameraScale > states[index - 1].cameraScale)
  }
  assert.ok(states.at(-1).cameraScale >= 6)
  assert.equal(states[1].cameraX, states[1].translateX)
  assert.equal(states[1].cameraY, states[1].translateY)
})

test('every LOD keeps its own registration geometry under the shared camera', () => {
  const viewport = { width: 833, height: 674 }
  const state = getCameraState(0.5, viewport)
  const registrations = MAP_LEVELS.map((level) =>
    getLevelRegistration(level, viewport)
  )

  assert.ok(new Set(registrations.map(({ width, height }) => `${width}:${height}`)).size > 1)
  for (const [index, registration] of registrations.entries()) {
    assert.equal(registration.targetWorld.x, state.targetWorld.x)
    assert.equal(registration.targetWorld.y, state.targetWorld.y)
    assert.equal(registration.worldScale, MAP_LEVELS[index].registrationScale)
  }
})
