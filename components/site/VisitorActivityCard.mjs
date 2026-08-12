'use client'

import { createElement, useEffect, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  buildVisitorDayActivity,
  buildVisitorTimeline,
  filterTrackedVisits,
  getVisitorDayNumber,
  VISITOR_TIMELINE_START_MS,
} from '../../lib/visitor-activity.mjs'
import { startSharedVisitFeed } from '../../lib/shared-visits.mjs'
import { getSharedVisitStore } from '../../lib/supabase-browser.mjs'

const SIDEBAR_CARET_URL = assetPath('media/figma-sidebar-caret.svg')
const REMOTE_REFRESH_MS = 30_000
const ACTIVITY_VISIT_LIMIT = 72

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
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [selectedDay, setSelectedDay] = useState(() => getVisitorDayNumber(Date.now()))
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const liveNow = nowMs || Date.now()
  const currentDay = getVisitorDayNumber(liveNow)
  const activity = buildVisitorDayActivity(visits, selectedDay, ACTIVITY_VISIT_LIMIT)
  const timeline = buildVisitorTimeline(visits, selectedDay, liveNow, ACTIVITY_VISIT_LIMIT)
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
