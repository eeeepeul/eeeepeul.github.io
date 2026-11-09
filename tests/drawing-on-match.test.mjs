import test from 'node:test'
import assert from 'node:assert/strict'

import { addAccessory, clearAccessories, getAccessories } from '../lib/character-accessories.mjs'
import { DRAWING_BOARD, drawnWidthOnMatch } from '../components/site/DrawingPad.mjs'

const rect = (width) => ({ getBoundingClientRect: () => ({ width }) })

test('a drawing put on the match keeps the size it had on the board', () => {
  // the board 160 wide on the screen (1.6 a square), the match 60 wide: 30 squares are 48 wide, 0.8 of the match
  const width = drawnWidthOnMatch(rect(DRAWING_BOARD.columns * 1.6), 30, rect(60))
  assert.ok(Math.abs(width - 0.8) < 1e-9)
})

test('without the match on the screen the drawing takes the usual size', () => {
  assert.equal(drawnWidthOnMatch(rect(160), 30, null), undefined)
  clearAccessories()
  addAccessory('data:image/png;base64,', 1, undefined)
  assert.equal(getAccessories()[0].width, 0.7)
})

test('the size asked for is kept within what the sidebar lets a drawing be resized to', () => {
  clearAccessories()
  addAccessory('data:image/png;base64,', 1, 1.07)
  addAccessory('data:image/png;base64,', 1, 9)
  addAccessory('data:image/png;base64,', 1, 0.01)
  assert.deepEqual(getAccessories().map((item) => item.width), [1.07, 3, 0.12])
  clearAccessories()
})
