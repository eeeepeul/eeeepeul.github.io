'use client'

import { createElement, useEffect, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  buildVisitorDayActivity,
  buildVisitorTimeline,
  filterTrackedVisits,
  getVisitorDayNumber,
  loadVisitorVisits,
  recordVisitorPageView,
} from '../../lib/visitor-activity.mjs'

const SIDEBAR_CARET_URL = assetPath('media/figma-sidebar-caret.svg')
const ACTIVITY_ENDPOINT = process.env.NEXT_PUBLIC_VISITOR_ACTIVITY_ENDPOINT || ''
const REMOTE_REFRESH_MS = 30_000
const ACTIVITY_VISIT_LIMIT = 72
let pageViewRecorded = false

function formatTime(timestamp) {
  if (!timestamp) return '--:--:--'

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(timestamp)
}

function ActivityBlock({ block, className, index }) {
  return createElement('span', {
    className,
    key: `${className}-${index}`,
    style: {
      '--activity-tone': block.tone,
      '--activity-width': `${block.width}px`,
      '--activity-x': `${block.x}px`,
      '--activity-y': `${block.y}px`,
    },
  })
}

export function VisitorActivityCard() {
  const [nowMs, setNowMs] = useState(0)
  const [visits, setVisits] = useState([])
  const [selectedDay, setSelectedDay] = useState(() => getVisitorDayNumber(Date.now()))
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const liveNow = nowMs || Date.now()
  const currentDay = getVisitorDayNumber(liveNow)
  const activity = buildVisitorDayActivity(visits, selectedDay, ACTIVITY_VISIT_LIMIT)
  const timeline = buildVisitorTimeline(visits, selectedDay, liveNow, ACTIVITY_VISIT_LIMIT)
  const formattedTime = formatTime(nowMs)
  const availableDays = Array.from({ length: currentDay }, (_, index) => currentDay - index)

  useEffect(() => {
    let isMounted = true
    const storage = window.localStorage
    const initialNow = Date.now()

    setNowMs(initialNow)

    if (!pageViewRecorded) {
      pageViewRecorded = true
      void recordVisitorPageView({
        endpoint: ACTIVITY_ENDPOINT,
        storage,
        nowMs: initialNow,
      }).then((nextVisits) => {
        if (isMounted) setVisits(nextVisits)
      })
    } else {
      void loadVisitorVisits({
        endpoint: ACTIVITY_ENDPOINT,
        storage,
        nowMs: initialNow,
      }).then((nextVisits) => {
        if (isMounted) setVisits(nextVisits)
      })
    }

    const clockTimer = window.setInterval(() => {
      const nextNow = Date.now()
      setNowMs(nextNow)
      setVisits((currentVisits) => filterTrackedVisits(currentVisits, nextNow))
    }, 1_000)

    const refreshTimer = window.setInterval(() => {
      const nextNow = Date.now()
      void loadVisitorVisits({
        endpoint: ACTIVITY_ENDPOINT,
        storage,
        nowMs: nextNow,
      }).then((nextVisits) => {
        if (isMounted) setVisits(nextVisits)
      })
    }, REMOTE_REFRESH_MS)

    return () => {
      isMounted = false
      window.clearInterval(clockTimer)
      window.clearInterval(refreshTimer)
    }
  }, [])

  return createElement(
    'section',
    {
      className: 'figma-sidebar-card figma-sidebar-activity',
      'aria-label': '최근 24시간 방문 활동',
      'data-activity-source': 'live',
      'data-activity-progress': 'live',
      'data-activity-storage': ACTIVITY_ENDPOINT ? 'shared' : 'local',
    },
    createElement(
      'header',
      { className: 'figma-sidebar-status' },
      createElement(
        'time',
        {
          className: 'figma-sidebar-status-chip figma-sidebar-time',
          dateTime: nowMs ? new Date(nowMs).toISOString() : undefined,
        },
        formattedTime
      ),
      createElement(
        'div',
        { className: 'figma-sidebar-status-group' },
        createElement(
          'span',
          {
            className: 'figma-sidebar-status-chip figma-sidebar-active',
            'aria-live': 'polite',
          },
          createElement('strong', null, 'Active :'),
          createElement('span', null, activity.activeCount.toLocaleString('en-US'))
        ),
        createElement(
          'div',
          {
            className: 'figma-sidebar-period-picker',
            onBlur: (event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsPeriodOpen(false)
            },
          },
          createElement(
            'button',
            {
              type: 'button',
              className: 'figma-sidebar-status-chip figma-sidebar-period',
              'aria-haspopup': 'listbox',
              'aria-expanded': isPeriodOpen,
              'aria-label': `방문 기록 날짜 선택, 현재 ${selectedDay} day`,
              onClick: () => setIsPeriodOpen((isOpen) => !isOpen),
            },
            `${selectedDay} day`,
            createElement('img', {
              className: `figma-sidebar-caret${isPeriodOpen ? ' is-open' : ''}`,
              src: SIDEBAR_CARET_URL,
              alt: '',
              draggable: false,
            })
          ),
          isPeriodOpen &&
            createElement(
              'div',
              {
                className: 'figma-sidebar-period-menu',
                role: 'listbox',
                'aria-label': '방문 기록 날짜',
              },
              availableDays.map((dayNumber) =>
                createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'figma-sidebar-period-option',
                    role: 'option',
                    'aria-selected': dayNumber === selectedDay,
                    key: `visitor-day-${dayNumber}`,
                    onClick: () => {
                      setSelectedDay(dayNumber)
                      setIsPeriodOpen(false)
                    },
                  },
                  `${dayNumber} day`
                )
              )
            )
        )
      )
    ),
    createElement(
      'div',
      {
        className: 'figma-sidebar-bars',
        role: 'img',
        'aria-label': `${selectedDay} day 동안 ${activity.activeCount.toLocaleString('ko-KR')}회 방문`,
      },
      timeline.visitBlocks.map((block, index) =>
        createElement(ActivityBlock, {
          block,
          className: 'figma-sidebar-visit',
          index,
          key: `visit-${index}`,
        })
      ),
      timeline.progressBlocks.map((block, index) =>
        createElement(ActivityBlock, {
          block,
          className: 'figma-sidebar-progress',
          index,
          key: `progress-${index}`,
        })
      )
    )
  )
}
