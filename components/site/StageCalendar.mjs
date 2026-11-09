import { createElement } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { CALENDAR_DAYS, SAMPLE_VISITORS, getDayFills } from '../../lib/calendar-visitors.mjs'

// Box 2 of the second pages: the calendar of the supplied pictures (a dark bar on top with the year and the month, then
// the days in five columns). Each day's square is filled dark from the bottom as far as that day's visitors reach
// (lib/calendar-visitors.mjs). It is drawn 344 x 718 as the pictures are and made to fit its box (see .stage-calendar in
// globals.css). The lettering is the pictures' own, not a font: the bar is the supplied bar (media/calendar-bar.png,
// "2026" and "Nov"), and the numbers of the days are cut out of the supplied calendar (media/calendar-numbers.png, the
// 30 numbers laid out like the days). To change the year or the month, the bar picture has to be changed.
export function StageCalendar({ visitors = SAMPLE_VISITORS }) {
  const fills = getDayFills(visitors, CALENDAR_DAYS)

  return createElement(
    'div',
    {
      className: 'stage-calendar',
      role: 'group',
      'aria-label': '달력, 날짜별 누적 방문자',
      style: {
        '--numbers': `url(${assetPath('media/calendar-numbers.png')})`,
        '--bar': `url(${assetPath('media/calendar-bar.png')})`,
      },
    },
    createElement('div', { className: 'stage-calendar__bar', role: 'img', 'aria-label': '2026 Nov' }),
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
          createElement('span', {
            className: 'stage-calendar__number',
            'aria-hidden': 'true',
            style: { '--col': index % 5, '--row': Math.floor(index / 5) },
          })
        )
      })
    )
  )
}
