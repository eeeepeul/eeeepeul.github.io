import test from 'node:test'
import assert from 'node:assert/strict'
import { ellipseCells, floodFill, hexToRgba, lineCells, rectCells, PAINT_PALETTE } from '../lib/paint-tools.mjs'

test('a line has both ends and no gaps', () => {
  const cells = lineCells(0, 0, 5, 2)
  assert.deepEqual(cells[0], [0, 0])
  assert.deepEqual(cells[cells.length - 1], [5, 2])
  for (let i = 1; i < cells.length; i += 1) {
    assert.ok(Math.abs(cells[i][0] - cells[i - 1][0]) <= 1 && Math.abs(cells[i][1] - cells[i - 1][1]) <= 1)
  }
  assert.deepEqual(lineCells(2, 2, 2, 2), [[2, 2]])
})

test('a rectangle is its edge, or all of it, from any two corners', () => {
  assert.equal(rectCells(0, 0, 3, 2).length, 4 * 3 - 2 * 1)
  assert.equal(rectCells(3, 2, 0, 0, true).length, 12)
})

test('an ellipse stays inside its rectangle and a filled one holds the edge one', () => {
  const edge = ellipseCells(0, 0, 8, 6)
  const filled = ellipseCells(0, 0, 8, 6, true)
  assert.ok(edge.length > 10 && edge.length < filled.length)
  edge.forEach(([x, y]) => assert.ok(x >= 0 && x <= 8 && y >= 0 && y <= 6))
  const inFilled = new Set(filled.map((cell) => cell.join(',')))
  edge.forEach((cell) => assert.ok(inFilled.has(cell.join(','))))
})

test('the fill covers the connected squares of one colour and stops at another colour', () => {
  const width = 4
  const height = 3
  const data = new Uint8ClampedArray(width * height * 4)
  // a wall of black down column 2
  for (let y = 0; y < height; y += 1) data.set([0, 0, 0, 255], (y * width + 2) * 4)
  const filled = floodFill(data, width, height, 0, 0, [255, 0, 0, 255])
  assert.equal(filled, 2 * 3)
  assert.deepEqual([...data.slice(0, 4)], [255, 0, 0, 255])
  assert.deepEqual([...data.slice(3 * 4, 3 * 4 + 4)], [0, 0, 0, 0]) // the other side is untouched
  assert.equal(floodFill(data, width, height, 0, 0, [255, 0, 0, 255]), 0) // nothing to do: already that colour
  assert.equal(floodFill(data, width, height, 9, 9, [1, 2, 3, 255]), 0)
})

test('the colours: hex to rgba, and a palette of 28', () => {
  assert.deepEqual(hexToRgba('#1c1c1c'), [28, 28, 28, 255])
  assert.equal(PAINT_PALETTE.length, 28)
})
