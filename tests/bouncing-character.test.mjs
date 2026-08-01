import test from 'node:test'
import assert from 'node:assert/strict'

const motionModule = await import('../lib/bouncing-character.mjs').catch(() => ({}))

test('moves the character freely inside the playfield', () => {
  assert.equal(typeof motionModule.advanceBouncingCharacter, 'function')

  assert.deepEqual(
    motionModule.advanceBouncingCharacter(
      { x: 10, y: 20, vx: 40, vy: 30 },
      { width: 200, height: 120, itemWidth: 40, itemHeight: 60 },
      0.25
    ),
    { x: 20, y: 27.5, vx: 40, vy: 30 }
  )
})

test('reverses direction when the character crosses a playfield wall', () => {
  assert.equal(typeof motionModule.advanceBouncingCharacter, 'function')

  assert.deepEqual(
    motionModule.advanceBouncingCharacter(
      { x: 158, y: 59, vx: 40, vy: 30 },
      { width: 200, height: 120, itemWidth: 40, itemHeight: 60 },
      0.1
    ),
    { x: 158, y: 58, vx: -40, vy: -30 }
  )
})

test('creates a bounded position, speed, and direction from random input', () => {
  assert.equal(typeof motionModule.createRandomBouncingCharacter, 'function')

  const values = [0.25, 0.5, 0.5, 0]
  let valueIndex = 0
  const random = () => values[valueIndex++]

  assert.deepEqual(
    motionModule.createRandomBouncingCharacter(
      { width: 200, height: 120, itemWidth: 40, itemHeight: 60 },
      random
    ),
    { x: 40, y: 30, vx: 90, vy: 0 }
  )
})

test('centers the followed character inside the visible playfield', () => {
  assert.equal(typeof motionModule.createFollowCameraOffset, 'function')

  assert.deepEqual(
    motionModule.createFollowCameraOffset(
      { x: 90, y: 40, itemWidth: 20, itemHeight: 30 },
      { width: 400, height: 200 }
    ),
    { x: 100, y: 45 }
  )
})

test('keeps an NPC at its screen position while the camera follows the player', () => {
  assert.equal(typeof motionModule.createCameraRelativeWorldPosition, 'function')

  assert.deepEqual(
    motionModule.createCameraRelativeWorldPosition(
      { x: 120, y: 80 },
      { x: -300, y: -200 }
    ),
    { x: 420, y: 280 }
  )
})
