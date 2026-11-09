import { createElement } from 'react'
import { CALENDAR_DAYS, SAMPLE_VISITORS, getDayFills } from '../../lib/calendar-visitors.mjs'

// Box 2 of the second pages, in the look of the classic Windows date picker (supplied picture): a silver ground, on top
// a month box (the month lit dark blue, with its drop-down key) and a year box (with its two small keys), under them a
// white sunken field with the days in five columns. Each day's square is filled dark blue from the bottom as far as that
// day's visitors reach (lib/calendar-visitors.mjs); a full day is dark blue with white figures. It is drawn 344 x 636 and
// made to fit its box (see .stage-calendar in globals.css). The month and the year are only shown, as before.
export function StageCalendar({ visitors = SAMPLE_VISITORS }) {
  const fills = getDayFills(visitors, CALENDAR_DAYS)

  return createElement(
    'div',
    {
      className: 'stage-calendar',
      role: 'group',
      'aria-label': '달력, 날짜별 누적 방문자',
    },
    createElement(
      'div',
      { className: 'stage-calendar__bar', role: 'img', 'aria-label': '2026 Nov' },
      createElement(
        'span',
        { className: 'stage-calendar__month', 'aria-hidden': 'true' },
        createElement('b', null, 'Nov'),
        createElement('i', { className: 'stage-calendar__key stage-calendar__key--drop' })
      ),
      createElement(
        'span',
        { className: 'stage-calendar__year', 'aria-hidden': 'true' },
        createElement('b', null, '2026'),
        createElement('i', { className: 'stage-calendar__key stage-calendar__key--up' }),
        createElement('i', { className: 'stage-calendar__key stage-calendar__key--down' })
      )
    ),
    createElement(
      'ol',
      { className: 'stage-calendar__days' },
      fills.map((fill, index) => {
        const day = index + 1
        const count = Number(visitors[day]) || 0
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
