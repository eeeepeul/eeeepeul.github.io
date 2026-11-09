import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { BRUSH_SIZES, DEFAULT_BRUSH, createHistory, hexText, hexToHsl, hslToHex, parseHex, stepBrush } from '../lib/drawing-tools.mjs'

test('+ makes the brush larger and - smaller, and neither goes past the ends', () => {
  assert.equal(stepBrush(DEFAULT_BRUSH, -1), 0)
  assert.equal(stepBrush(0, 1), 1)
  assert.equal(stepBrush(BRUSH_SIZES.length - 1, 1), BRUSH_SIZES.length - 1)
  assert.ok(BRUSH_SIZES.every((size, index) => index === 0 || size > BRUSH_SIZES[index - 1]))
})

test('undo goes back one stroke and redo goes forward again; a new stroke ends the redo', () => {
  const history = createHistory()
  assert.ok(!history.canUndo() && !history.canRedo())
  history.record('empty')
  history.record('one')
  assert.equal(history.undo('two'), 'one')
  assert.equal(history.undo('one'), 'empty')
  assert.equal(history.undo('empty'), null)
  assert.equal(history.redo('empty'), 'one')
  assert.ok(history.canRedo())
  history.record('three')
  assert.ok(!history.canRedo())
  assert.equal(history.redo('x'), null)
})

test('the history keeps only the last strokes it is told to', () => {
  const history = createHistory(2)
  ;['a', 'b', 'c'].forEach((step) => history.record(step))
  assert.equal(history.undo('now'), 'c')
  assert.equal(history.undo('c'), 'b')
  assert.equal(history.undo('b'), null)
})

test('the colour field reads six or three hex digits, with or without #', () => {
  assert.equal(parseHex('D9D9D9'), '#d9d9d9')
  assert.equal(parseHex('#FA0'), '#ffaa00')
  assert.equal(parseHex('xyz'), null)
  assert.equal(parseHex('12345'), null)
  assert.equal(hexText('#d9d9d9'), 'D9D9D9')
})

test('the pad has the one tool row of the supplied picture: colour, < >, + -, clear, then input and save', () => {
  const source = readFileSync(new URL('../components/site/DrawingPad.mjs', import.meta.url), 'utf8')
  const order = ['drawing-pad__colour', 'drawing-pad__arrows', 'drawing-pad__sizes', 'drawing-pad__clear', 'drawing-pad__actions']
  const places = order.map((name) => source.indexOf(`'${name}'`))
  assert.ok(places.every((place) => place > 0), 'a tool is missing')
  assert.deepEqual([...places].sort((a, b) => a - b), places)
  assert.match(source, /'되돌리기'/)
  assert.match(source, /'다시 앞으로'/)
})

test('the colour chooser turns hex into hue, saturation and lightness and back', () => {
  assert.deepEqual(hexToHsl('#ff0000'), { h: 0, s: 100, l: 50 })
  assert.deepEqual(hexToHsl('#00ff00'), { h: 120, s: 100, l: 50 })
  assert.deepEqual(hexToHsl('#808080'), { h: 0, s: 0, l: 50 })
  assert.equal(hslToHex({ h: 0, s: 100, l: 50 }), '#ff0000')
  assert.equal(hslToHex({ h: 240, s: 100, l: 50 }), '#0000ff')
  assert.equal(hslToHex({ h: 200, s: 60, l: 0 }), '#000000')
  assert.equal(hslToHex({ h: 200, s: 60, l: 100 }), '#ffffff')
  for (const hex of ['#d9392b', '#4aa3b4', '#f2c94c', '#1c1c1c']) {
    const back = hslToHex(hexToHsl(hex))
    const near = (a, b) => Math.abs(parseInt(a, 16) - parseInt(b, 16)) <= 3
    assert.ok([1, 3, 5].every((i) => near(hex.slice(i, i + 2), back.slice(i, i + 2))), `${hex} came back as ${back}`)
  }
})

test('the swatch opens a chooser with a hue bar over a lightness bar, at the pad\'s lower left', () => {
  const source = readFileSync(new URL('../components/site/DrawingPad.mjs', import.meta.url), 'utf8')
  assert.ok(source.indexOf('drawing-pad__bar--hue') > 0)
  assert.ok(source.indexOf('drawing-pad__bar--hue') < source.indexOf('drawing-pad__bar--light'))
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  assert.match(css, /\.drawing-pad__chooser\s*\{[^}]*left:\s*8px;[^}]*bottom:/)
})
