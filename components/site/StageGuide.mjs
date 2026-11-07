'use client'

import { createElement as h, useEffect, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// The guide: the info button of the map's bar dims the whole stage and lays a note over each of the
// boxes (the supplied layout, ten notes). A note is a small white tab, a line "name ····· : name"
// and the text below it. The words are the supplied stand-ins until the real ones arrive: change
// them in NOTES. Pressing anywhere, or Esc, or the info button again, puts the stage back.
// Everything is on the 2000 plan (1 unit = 0.05cqw) and scales with the stage.
const LEAD = 'EPEUL is a VJ artist who explores the idea that, much like the proverb.'

// [left, top, width, height] of the note's frame, and its text
const NOTES = [
  { box: [33, 36, 320, 84], text: LEAD },
  { box: [1634, 62, 320, 84], text: LEAD },
  { box: [1634, 221, 320, 84], text: LEAD },
  { box: [33, 441, 320, 84], text: LEAD },
  { box: [1634, 583, 320, 84], text: LEAD },
  { box: [33, 711, 320, 84], text: LEAD },
  { box: [1634, 712, 320, 84], text: LEAD },
  { box: [282, 851, 320, 64], text: 'EPEUL is a VJ artist who' },
  { box: [33, 1020, 320, 84], text: LEAD },
  { box: [554, 1016, 509, 64], text: LEAD },
]

// the links at the foot of the guide; spacing is measured on the letters as drawn in the face of the
// guide (Nanum Gothic Coding): the gap after each letter is brought to 0.233em
const LEGAL_LINKS = [
  { page: 'privacy', text: '개인정보처리방침', spacing: [-0.011, 0.004, 0.02, 0.087, -0.069, -0.058, 0.077] },
  { page: 'terms', text: '이용약관', spacing: [0.015, 0.067, 0.124] },
]

export function StageGuide() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onAsk = (event) => {
      if (event.detail?.toggle) setOpen((value) => !value)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('stage:guide', onAsk)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('stage:guide', onAsk)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('stage:guide-state', { detail: { open } }))
  }, [open])

  if (!open) return null

  return h(
    'div',
    { className: 'guide', role: 'dialog', 'aria-label': '칸별 설명', onClick: () => setOpen(false) },
    NOTES.map(({ box: [left, top, width, height], text }, index) =>
      h(
        'div',
        {
          key: index,
          className: 'guide__note',
          style: {
            left: `calc(${left} * var(--u))`,
            top: `calc(${top} * var(--u))`,
            width: `calc(${width} * var(--u))`,
            height: `calc(${height} * var(--u))`,
          },
        },
        h('span', { className: 'guide__tab', 'aria-hidden': 'true' }),
        h('p', { className: 'guide__line' }, h('span', null, 'section01'), h('i', { className: 'guide__dots', 'aria-hidden': 'true' }), h('span', null, ': section01')),
        h('p', { className: 'guide__text' }, text)
      )
    ),
    // the policy links show only while the guide is open
    h(
      'nav',
      { className: 'guide__legal', 'aria-label': '정책 문서' },
      LEGAL_LINKS.map(({ page, text, spacing }) =>
        h(
          'a',
          { key: page, href: `${assetPath(page)}/` },
          // every letter takes its own small spacing after it (in em), so the gaps between the drawn
          // letters are even: the letters are all the same width on the line, but not as drawn
          Array.from(text, (letter, index) =>
            h('span', { key: index, style: spacing[index] ? { letterSpacing: `${spacing[index]}em` } : undefined }, letter)
          )
        )
      )
    )
  )
}
