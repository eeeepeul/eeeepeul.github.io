'use client'

import { createElement, useEffect, useMemo, useState } from 'react'

// Cell 5: the visitor record. A clock, the day of the month, a range menu, and under them
// three rows of black bars, one for each time someone came in, with pale grey blocks behind the
// stretches where many came at once. Nobody has to be on the site for it to work: the bars and
// the count are made up, and move on with the clock. The rows read as one rolling day: what is
// before the cursor is today, what is after it is the same hours of the day before.
const ROW_WIDTH = 744
const ROW_HEIGHT = 82
const ROW_TOPS = [8, 92, 176]
const RANGES = [
  { label: '1 day', seed: 11 },
  { label: '3 day', seed: 23 },
  { label: '7 day', seed: 37 },
]
const BAR_WIDTHS = [4, 4, 4, 6, 6, 8, 8, 10, 12, 14, 20, 28]

function random(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// One day's worth of bars and busy blocks, from a seed.
function makeDay(seed) {
  const rand = random(seed)
  const bars = []
  const blocks = []
  for (let row = 0; row < 3; row += 1) {
    // a couple of stretches where many came at once
    const windows = []
    const count = 1 + Math.floor(rand() * 2)
    for (let k = 0; k < count; k += 1) {
      const width = 90 + rand() * 230
      const start = 10 + rand() * (ROW_WIDTH - width - 20)
      windows.push([start, start + width])
      blocks.push({ row, x0: start, x1: start + width })
    }
    let x = 6 + rand() * 8
    while (x < ROW_WIDTH) {
      const busy = windows.some(([a, b]) => x >= a && x <= b)
      const width = BAR_WIDTHS[Math.floor(rand() * BAR_WIDTHS.length)]
      bars.push({ row, x, width })
      x += width + (busy ? 3 + rand() * 10 : 8 + Math.pow(rand(), 1.6) * 70)
    }
  }
  return { bars, blocks }
}

function clock(date) {
  const two = (value) => String(value).padStart(2, '0')
  return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`
}

export function StageVisitors() {
  const [range, setRange] = useState(0)
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(null)

  useEffect(() => {
    setNow(new Date())
    const tick = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      window.clearInterval(tick)
    }
  }, [])

  const dayNumber = now ? Math.floor(now.getTime() / 86_400_000) : 0
  const seed = RANGES[range].seed
  const today = useMemo(() => makeDay(seed * 1000 + dayNumber), [seed, dayNumber])
  const before = useMemo(() => makeDay(seed * 1000 + dayNumber - 1), [seed, dayNumber])

  const secondsOfDay = now ? now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() : 0
  const cursor = (secondsOfDay / 86_400) * ROW_WIDTH * 3
  const place = (item) => item.row * ROW_WIDTH + item.x
  const shown = (day, test) => day.bars.filter(test)
  const bars = [
    ...shown(today, (bar) => place(bar) <= cursor),
    ...shown(before, (bar) => place(bar) > cursor),
  ]
  const blocks = [
    ...today.blocks.filter((block) => block.row * ROW_WIDTH + block.x1 <= cursor),
    ...before.blocks.filter((block) => block.row * ROW_WIDTH + block.x0 > cursor),
  ]
  const cursorRow = Math.min(2, Math.floor(cursor / ROW_WIDTH))
  const cursorX = cursor - cursorRow * ROW_WIDTH

  // The number beside Active is just the day of the month, as on a calendar.
  const active = now ? String(now.getDate()) : '--'

  return createElement(
    'div',
    { className: 'visitors' },
    createElement(
      'header',
      { className: 'visitors-bar' },
      createElement('time', { className: 'visitors-chip visitors-time' }, now ? clock(now) : '--:--:--'),
      createElement(
        'span',
        { className: 'visitors-chip visitors-active', 'aria-live': 'polite' },
        createElement('span', null, 'Active :'),
        createElement('strong', null, active)
      ),
      createElement(
        'div',
        { className: 'visitors-range', onBlur: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) } },
        createElement(
          'button',
          {
            type: 'button',
            className: 'visitors-chip visitors-select',
            'aria-haspopup': 'listbox',
            'aria-expanded': open,
            'aria-label': `방문 기록 기간, 현재 ${RANGES[range].label}`,
            onClick: () => setOpen((value) => !value),
          },
          createElement('span', null, RANGES[range].label),
          createElement(
            'svg',
            { viewBox: '0 0 14 8', width: 14, height: 8, 'aria-hidden': 'true' },
            createElement('path', { d: 'M1 1l6 6 6-6', fill: 'none', stroke: '#fff', strokeWidth: 2 })
          )
        ),
        open
          ? createElement(
              'ul',
              { className: 'visitors-menu', role: 'listbox' },
              RANGES.map((item, index) =>
                createElement(
                  'li',
                  { key: item.label, role: 'option', 'aria-selected': index === range },
                  createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => {
                        setRange(index)
                        setOpen(false)
                      },
                    },
                    item.label
                  )
                )
              )
            )
          : null
      )
    ),
    createElement(
      'svg',
      {
        className: 'visitors-chart',
        viewBox: `0 0 760 266`,
        preserveAspectRatio: 'none',
        role: 'img',
        'aria-label': '시간대별 방문 기록',
      },
      blocks.map((block, index) =>
        createElement('rect', {
          key: `block-${index}`,
          x: 6 + block.x0,
          y: ROW_TOPS[block.row],
          width: block.x1 - block.x0,
          height: ROW_HEIGHT,
          fill: '#6a6a6a',
          opacity: 0.55,
        })
      ),
      bars.map((bar, index) =>
        createElement('rect', {
          key: `bar-${index}`,
          x: 6 + bar.x,
          y: ROW_TOPS[bar.row],
          width: bar.width,
          height: ROW_HEIGHT,
          fill: '#2a2a2a',
        })
      ),
      now
        ? createElement('rect', {
            x: 6 + cursorX,
            y: ROW_TOPS[cursorRow],
            width: 5,
            height: ROW_HEIGHT,
            fill: '#f4f4f2',
            opacity: 0.9,
          })
        : null
    )
  )
}
