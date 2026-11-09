'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { SAMPLE_VISITORS, getDayFills } from '../../lib/calendar-visitors.mjs'

// Box 2 of the second pages, in the look of the classic Windows date picker (supplied picture), in the colours of the
// main screen: a month box (the month in plain ink, with its drop-down key that opens the list of the twelve months) and
// a year box (with its two small keys, one year up and one year down), under them a sunken field with the days in five
// columns. Each day's square is filled dark from the bottom as far as that day's visitors reach (lib/calendar-visitors.mjs);
// a full day is dark with light figures. It is drawn 344 x 636 and made to fit its box (see .stage-calendar in globals.css).
// The visitors are the placeholder counts of November 2026 (the month it opens on); other months show their days empty
// until real counts are recorded for them.
export const CALENDAR_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const CALENDAR_FIRST_YEAR = 1970
export const CALENDAR_LAST_YEAR = 2100
export const CALENDAR_START = { year: 2026, month: 10 }

export function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export function StageCalendar({ visitors = SAMPLE_VISITORS }) {
  const [shown, setShown] = useState(CALENDAR_START)
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef(null)
  const { year, month } = shown
  const days = getDaysInMonth(year, month)
  const counts = year === CALENDAR_START.year && month === CALENDAR_START.month ? visitors : {}
  const fills = getDayFills(counts, days)
  const label = `${year} ${CALENDAR_MONTHS[month]}`

  useEffect(() => {
    if (!menuOpen) return undefined
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const moveYear = (step) =>
    setShown((current) => ({
      ...current,
      year: Math.min(CALENDAR_LAST_YEAR, Math.max(CALENDAR_FIRST_YEAR, current.year + step)),
    }))

  return createElement(
    'div',
    {
      ref: rootRef,
      className: 'stage-calendar',
      role: 'group',
      'aria-label': '달력, 날짜별 누적 방문자',
    },
    createElement(
      'div',
      { className: 'stage-calendar__bar', role: 'group', 'aria-label': label },
      createElement(
        'span',
        { className: 'stage-calendar__month' },
        createElement('b', { onClick: () => setMenuOpen((open) => !open) }, CALENDAR_MONTHS[month]),
        createElement('button', {
          type: 'button',
          className: 'stage-calendar__key stage-calendar__key--drop',
          'aria-label': '달 고르기',
          'aria-haspopup': 'listbox',
          'aria-expanded': menuOpen,
          onClick: () => setMenuOpen((open) => !open),
        })
      ),
      createElement(
        'span',
        { className: 'stage-calendar__year' },
        createElement('b', null, String(year)),
        createElement('button', {
          type: 'button',
          className: 'stage-calendar__key stage-calendar__key--up',
          'aria-label': '해 늘리기',
          disabled: year >= CALENDAR_LAST_YEAR,
          onClick: () => moveYear(1),
        }),
        createElement('button', {
          type: 'button',
          className: 'stage-calendar__key stage-calendar__key--down',
          'aria-label': '해 줄이기',
          disabled: year <= CALENDAR_FIRST_YEAR,
          onClick: () => moveYear(-1),
        })
      )
    ),
    menuOpen
      ? createElement(
          'ul',
          { className: 'stage-calendar__menu', role: 'listbox', 'aria-label': '달' },
          CALENDAR_MONTHS.map((name, index) =>
            createElement(
              'li',
              { key: name, role: 'option', 'aria-selected': index === month },
              createElement(
                'button',
                {
                  type: 'button',
                  className: index === month ? 'is-current' : undefined,
                  onClick: () => {
                    setShown((current) => ({ ...current, month: index }))
                    setMenuOpen(false)
                  },
                },
                name
              )
            )
          )
        )
      : null,
    createElement(
      'ol',
      { className: 'stage-calendar__days' },
      fills.map((fill, index) => {
        const day = index + 1
        const count = Number(counts[day]) || 0
        return createElement(
          'li',
          {
            key: day,
            className: `stage-calendar__day${fill >= 1 ? ' is-full' : ''}`,
            'data-day': day,
            'data-visitors': count,
            style: { '--fill': fill },
            'aria-label': `${day}일, 방문자 ${count}명`,
          },
          createElement('span', { className: 'stage-calendar__number', 'aria-hidden': 'true' }, day)
        )
      })
    )
  )
}
