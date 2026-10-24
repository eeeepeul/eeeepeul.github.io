'use client'

import { createElement, useEffect, useMemo, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  buildVisitorDayActivity,
  buildVisitorTimeline,
  filterTrackedVisits,
  getVisitorDayNumber,
  VISITOR_TIMELINE_START_MS,
  VISITOR_WINDOW_MS,
} from '../../lib/visitor-activity.mjs'
import { startSharedVisitFeed } from '../../lib/shared-visits.mjs'
import { getSharedVisitStore } from '../../lib/supabase-browser.mjs'

const SIDEBAR_CARET_URL = assetPath('media/figma-sidebar-caret.svg')
const REMOTE_REFRESH_MS = 30_000
const ACTIVITY_VISIT_LIMIT = 600

// A busy-looking sidebar: a made-up crowd mixed in with the real visits, for the look of the
// panel only. It is drawn here and never stored or sent anywhere. Every day gets its own
// fixed crowd (so the same day always looks the same), thicker through the afternoon and
// evening, and today's fills in as the day goes on.
function crowdRandom(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function buildCrowd(dayNumber, nowMs) {
  const random = crowdRandom(dayNumber * 7919 + 13)
  const dayStart = VISITOR_TIMELINE_START_MS + (dayNumber - 1) * VISITOR_WINDOW_MS
  const hours = VISITOR_WINDOW_MS / 3_600_000
  const crowd = []
  const add = (hour) => {
    const at = dayStart + hour * 3_600_000
    if (hour >= 0 && hour < hours && at <= nowMs) crowd.push(at)
  }
  // Visits come in uneven bursts of different sizes with quiet gaps between, plus strays.
  const bursts = 22 + Math.floor(random() * 12)
  for (let burst = 0; burst < bursts; burst += 1) {
    const centre = random() * hours
    const spread = 0.05 + random() * random() * 0.9
    const size = 4 + Math.floor(Math.pow(random(), 1.7) * 46)
    for (let k = 0; k < size; k += 1) {
      // roughly bell-shaped around the centre
      const offset = (random() + random() + random() - 1.5) * spread * 2
      add(centre + offset)
    }
  }
  const strays = 50 + Math.floor(random() * 60)
  for (let k = 0; k < strays; k += 1) add(random() * hours)
  return crowd
}

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
    // Positions derive from Date.now(), so server and client renders differ by design.
    suppressHydrationWarning: true,
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
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [selectedDay, setSelectedDay] = useState(() => getVisitorDayNumber(Date.now()))
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const liveNow = nowMs || Date.now()
  const currentDay = getVisitorDayNumber(liveNow)
  const crowd = useMemo(() => buildCrowd(selectedDay, liveNow), [selectedDay, Math.floor(liveNow / 60_000)]) // eslint-disable-line react-hooks/exhaustive-deps
  const shownVisits = useMemo(() => [...visits, ...crowd], [visits, crowd])
  const activity = buildVisitorDayActivity(shownVisits, selectedDay, ACTIVITY_VISIT_LIMIT)
  const timeline = buildVisitorTimeline(shownVisits, selectedDay, liveNow, ACTIVITY_VISIT_LIMIT)
  const formattedTime = formatTime(nowMs)
  const availableDays = Array.from({ length: currentDay }, (_, index) => currentDay - index)

  useEffect(() => {
    const initialNow = Date.now()

    setNowMs(initialNow)
    const feed = startSharedVisitFeed({
      store: getSharedVisitStore(),
      getSinceMs: () => VISITOR_TIMELINE_START_MS,
      onVisits: (sharedVisits) => {
        setVisits(sharedVisits.map((visit) => visit.visitedAt))
      },
      onStatus: setConnectionStatus,
      eventTarget: window,
      setIntervalImpl: window.setInterval.bind(window),
      clearIntervalImpl: window.clearInterval.bind(window),
      refreshMs: REMOTE_REFRESH_MS,
    })

    const clockTimer = window.setInterval(() => {
      const nextNow = Date.now()
      setNowMs(nextNow)
      setVisits((currentVisits) => filterTrackedVisits(currentVisits, nextNow))
    }, 1_000)

    return () => {
      window.clearInterval(clockTimer)
      void feed.cleanup()
    }
  }, [])

  return createElement(
    'section',
    {
      className: 'figma-sidebar-card figma-sidebar-activity',
      'aria-label': '최근 24시간 방문 활동',
      'data-activity-source': 'live',
      'data-activity-progress': 'live',
      'data-activity-storage': connectionStatus,
      title:
        connectionStatus === 'shared'
          ? '모든 방문자의 기록과 실시간 연결됨'
          : connectionStatus === 'offline'
            ? '공유 방문 기록 연결을 다시 시도하고 있습니다'
            : '공유 방문 기록 연결 중',
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
