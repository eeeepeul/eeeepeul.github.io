import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { CALENDAR_DAYS, SAMPLE_VISITORS, getDayFills } from '../lib/calendar-visitors.mjs'
import { StageCalendar } from '../components/site/StageCalendar.mjs'

test('a day is filled as far as its visitors reach, the busiest day to the top', () => {
  const fills = getDayFills({ 1: 100, 2: 50, 3: 25, 5: 0 }, 5)
  assert.deepEqual(fills, [1, 0.5, 0.25, 0, 0])
})

test('a day with some visitors shows a sliver, a day with none stays empty', () => {
  const fills = getDayFills({ 1: 1000, 2: 1 }, 3)
  assert.equal(fills[0], 1)
  assert.ok(fills[1] >= 0.04 && fills[1] < 0.1)
  assert.equal(fills[2], 0)
})

test('no visitors at all leaves every day empty', () => {
  assert.deepEqual(getDayFills({}, 4), [0, 0, 0, 0])
})

test('the sample follows the supplied picture: days 1, 19 and 22 are full, about a quarter on eight days', () => {
  const fills = getDayFills(SAMPLE_VISITORS)
  assert.equal(fills.length, CALENDAR_DAYS)
  ;[1, 19, 22].forEach((day) => assert.equal(fills[day - 1], 1))
  ;[2, 4, 6, 7, 15, 18, 25, 26].forEach((day) => assert.ok(Math.abs(fills[day - 1] - 0.24) < 0.001))
  assert.equal(fills.filter((fill) => fill === 0).length, 30 - 11)
})

test('the calendar shows 30 days with their own fill and a count for each', () => {
  const html = renderToStaticMarkup(createElement(StageCalendar))
  assert.equal((html.match(/class="stage-calendar__day( is-full)?"/g) || []).length, 30)
  assert.match(html, /data-day="19" data-visitors="100" style="--fill:1"/)
  assert.match(html, /data-day="2" data-visitors="24" style="--fill:0\.24"/)
  assert.match(html, /data-day="3" data-visitors="0" style="--fill:0"/)
  assert.match(html, /class="stage-calendar__day is-full"/)
  // the look of the classic date picker: a month box and a year box on top, the day numbers as text
  assert.match(html, /class="stage-calendar__bar" role="group" aria-label="2026 Nov"/)
  assert.match(html, /class="stage-calendar__month"><b>Nov<\/b>/)
  assert.match(html, /class="stage-calendar__year"><b>2026<\/b>/)
  assert.match(html, /class="stage-calendar__number" aria-hidden="true">19<\/span>/)
})

test('the calendar stands in box 2 of the second pages', async () => {
  const { SECOND_STAGE_BOXES } = await import('../components/site/SecondStage.mjs')
  assert.equal(SECOND_STAGE_BOXES[1][0], 'calendar')
})

test('the space under the calendar goes to box 4, which is split in two (upper two thirds, lower third)', async () => {
  const { SECOND_STAGE_BOXES } = await import('../components/site/SecondStage.mjs')
  const box = (name) => SECOND_STAGE_BOXES.find(([n]) => n === name)
  const [, , calendarTop, , calendarHeight] = box('calendar')
  const [, , upperTop, , upperHeight] = box('panels-upper')
  const [, , lowerTop, , lowerHeight] = box('panels-lower')
  const [, , satelliteTop] = box('satellite')
  // box 4 starts where the calendar ends and runs down to the satellite bar, with no gap or overlap
  assert.equal(calendarTop + calendarHeight, upperTop)
  assert.equal(upperTop + upperHeight, lowerTop)
  assert.equal(lowerTop + lowerHeight, satelliteTop)
  // the upper part is two thirds, the lower part one third
  assert.equal(upperHeight, 2 * lowerHeight)
})

test('the drawing pad stands in box 4-1, drawn at the box\'s width', async () => {
  const { readFileSync } = await import('node:fs')
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  const { SECOND_STAGE_BOXES } = await import('../components/site/SecondStage.mjs')
  const [, left, top, width] = SECOND_STAGE_BOXES.find(([name]) => name === 'panels-upper')
  const rule = css.slice(css.indexOf('.second-stage .drawing-pad {'), css.indexOf('/* the pad lies in the room'))
  assert.match(rule, new RegExp(`top:\\s*${top}px`))
  assert.match(rule, new RegExp(`left:\\s*${left}(px)?;`))
  // the pad is made 221 wide; at the scale given it is exactly as wide as the box
  const scale = Number(rule.match(/scale\(([\d.]+)\)/)[1])
  assert.ok(Math.abs(221 * scale - width) < 0.1)
})

test('the drawing board is tall enough for the pad to fill box 4-1 from top to bottom', async () => {
  const { readFileSync } = await import('node:fs')
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  const { DRAWING_BOARD } = await import('../components/site/DrawingPad.mjs')
  const { SECOND_STAGE_BOXES } = await import('../components/site/SecondStage.mjs')
  const [, , , , boxHeight] = SECOND_STAGE_BOXES.find(([name]) => name === 'panels-upper')
  const rule = css.slice(css.indexOf('.second-stage .drawing-pad {'), css.indexOf('/* the pad lies in the room'))
  const scale = Number(rule.match(/scale\(([\d.]+)\)/)[1])
  // the pad is the board (its rows drawn 2 pixels high, with a line round it) and 66 pixels of tools, bar and padding
  const padHeight = DRAWING_BOARD.rows * DRAWING_BOARD.scale + 2 + 66
  assert.ok(Math.abs(padHeight * scale - boxHeight) < 1, `${padHeight * scale} is not ${boxHeight}`)
})

test('the drawing board is as wide as the pad: no empty space to its right', async () => {
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../components/site/DrawingPad.mjs', import.meta.url), 'utf8')
  // the board takes the whole width of the pad (its tools are 203 wide) and about 2 pixels for each column
  // (the board sits in a box of its own, so a board made wider by the Paint window cannot make the pad wider)
  assert.match(source, /className: 'drawing-pad__board'[^}]*width: '100%'[^}]*minWidth: 203[^}]*height: ROWS \* SCALE/)
  const { DRAWING_BOARD } = await import('../components/site/DrawingPad.mjs')
  assert.ok(Math.abs(DRAWING_BOARD.columns * DRAWING_BOARD.scale + 2 - 203) <= 2)
})

test('the calendar knows how many days each month has', async () => {
  const { getDaysInMonth } = await import('../components/site/StageCalendar.mjs')
  assert.equal(getDaysInMonth(2026, 10), 30)
  assert.equal(getDaysInMonth(2026, 11), 31)
  assert.equal(getDaysInMonth(2026, 1), 28)
  assert.equal(getDaysInMonth(2028, 1), 29)
})
