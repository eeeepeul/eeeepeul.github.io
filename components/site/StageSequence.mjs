'use client'

import { createElement as h, useEffect, useState } from 'react'

// Cell 17: two lines of a sequence alignment, as supplied: a name, a start number, 58 places of
// letters and gaps (83 of them, so the end number stands at the far edge of the box), and an end
// number. The letters (E P U L M O) keep changing at random, a place or two at a time, so the lines
// never stay the same; the gaps stay where they are. A place is
// shaded with a fine dotted pattern where the two lines hold letters of the same kind (E and O,
// M and L, P and U), the way an alignment marks what agrees. On the 2000 plan the cell is 686 x 26,
// and everything is sized in its units (1 unit = 0.05cqw): small enough that both names fit.
const LETTERS = ['E', 'P', 'U', 'L', 'M', 'O']
const KINDS = { E: 0, O: 0, M: 1, L: 1, P: 2, U: 2 }
const PLACES = 83

// the starting lines: the supplied pattern of letters and gaps, stretched to fill the cell. The
// gaps are kept where the supplied lines had them (a run at the start, a short one in the middle
// of the first line, a long run at the end); the letters come from a fixed series so the first
// paint is the same on the server and in the browser.
const series = (count, seed) => {
  let value = seed
  return Array.from({ length: count }, () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return LETTERS[Math.floor((value / 2147483648) * LETTERS.length)]
  }).join('')
}
const FIRST = '-'.repeat(10) + series(33, 7) + '--' + series(21, 19) + '-'.repeat(17)
const SECOND = series(64, 31) + '-'.repeat(PLACES - 64)
const CHANGE_MS = 130

const row = (name, start, places, end, other) =>
  h(
    'div',
    { className: 'sequence__row' },
    h('span', { className: 'sequence__name' }, name),
    h('span', { className: 'sequence__start' }, start),
    h(
      'span',
      { className: 'sequence__places' },
      places.map((letter, index) => {
        const mate = other[index]
        const alike = letter !== '-' && mate !== '-' && KINDS[letter] === KINDS[mate]
        return h('span', { key: index, className: `sequence__place${alike ? ' is-alike' : ''}` }, letter)
      })
    ),
    h('span', { className: 'sequence__end' }, end)
  )

export function StageSequence() {
  const [first, setFirst] = useState(() => FIRST.split(''))
  const [second, setSecond] = useState(() => SECOND.split(''))

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const change = (places) => {
      const next = [...places]
      const slots = next.flatMap((letter, index) => (letter === '-' ? [] : [index]))
      for (let k = 0; k < 2; k += 1) {
        const at = slots[Math.floor(Math.random() * slots.length)]
        next[at] = LETTERS[Math.floor(Math.random() * LETTERS.length)]
      }
      return next
    }
    const timer = window.setInterval(() => {
      setFirst(change)
      setSecond(change)
    }, CHANGE_MS)
    return () => window.clearInterval(timer)
  }, [])

  return h(
    'div',
    { className: 'sequence', role: 'img', 'aria-label': 'EPEUL과 mooeemee의 서열 정렬, 글자가 계속 바뀝니다' },
    row('EPEUL', '79', first, '207', second),
    row('mooeemee', '116', second, '113', first)
  )
}
