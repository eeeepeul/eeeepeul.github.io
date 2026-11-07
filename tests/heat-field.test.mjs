import assert from 'node:assert/strict'
import test from 'node:test'
import { HEAT_ASPECT, HEAT_BAND_COLORS, heatAt, heatColor, heatGrid } from '../lib/heat-field.mjs'

// the drawing's heat (heatGrid) must be the very numbers heatAt gives, point by point
test('heatGrid gives the heat that heatAt gives', () => {
  const columns = 60
  const rows = Math.round(columns * HEAT_ASPECT)
  for (const time of [0, 3, 17.25, 123.4]) {
    const grid = heatGrid(time, columns, rows)
    let worst = 0
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        worst = Math.max(worst, Math.abs(grid[y * columns + x] - heatAt((x + 0.5) / columns, (y + 0.5) / rows, time)))
      }
    }
    assert.ok(worst < 1e-5, `time ${time}: worst difference ${worst}`)
  }
})

test('the colour of each band is the colour heatColor gives', () => {
  for (let band = 0; band < 8; band += 1) {
    const heat = band >= 7 ? 1 : (band + 0.5) / 7
    assert.deepEqual(HEAT_BAND_COLORS[band], heatColor(heat).slice(0, 3))
  }
  // and every heat falls in the band whose colour it gets
  for (let heat = 0; heat <= 1.05; heat += 0.0137) {
    const band = Math.min(7, Math.floor(Math.min(1, heat) * 7))
    assert.deepEqual(HEAT_BAND_COLORS[band], heatColor(heat).slice(0, 3), `heat ${heat}`)
  }
})
