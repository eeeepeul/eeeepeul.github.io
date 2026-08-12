'use client'

import { Fragment, createElement, useEffect, useState } from 'react'
import { HOUSE_VISIT_WINDOW_MS, countRecentHouseVisits } from '../../lib/house-visits.mjs'
import { startSharedVisitFeed } from '../../lib/shared-visits.mjs'
import { getSharedVisitStore } from '../../lib/supabase-browser.mjs'
import { HouseDistanceCard, DEFAULT_HOUSE_DISTANCES } from './HouseDistanceCard.mjs'
import { HouseMapCard } from './HouseMapCard.mjs'

const HOUSE_VISIT_REFRESH_MS = 30_000
const EMPTY_VISIT_COUNTS = { house1: 0, house2: 0, house3: 0, house4: 0 }

export function HouseMapSection() {
  const [mapState, setMapState] = useState({
    distances: DEFAULT_HOUSE_DISTANCES,
    houseIndex: 0,
  })
  const [visitCounts, setVisitCounts] = useState(EMPTY_VISIT_COUNTS)

  useEffect(() => {
    const feed = startSharedVisitFeed({
      store: getSharedVisitStore(),
      getSinceMs: () => Date.now() - HOUSE_VISIT_WINDOW_MS,
      onVisits: (sharedVisits) => {
        setVisitCounts(
          countRecentHouseVisits(
            sharedVisits.map((visit) => ({
              houseId: visit.houseId,
              visitedAt: visit.visitedAt,
            })),
            Date.now()
          )
        )
      },
      eventTarget: window,
      setIntervalImpl: window.setInterval.bind(window),
      clearIntervalImpl: window.clearInterval.bind(window),
      refreshMs: HOUSE_VISIT_REFRESH_MS,
    })

    return () => {
      void feed.cleanup()
    }
  }, [])

  return createElement(
    Fragment,
    null,
    createElement(HouseDistanceCard, { onStateChange: setMapState }),
    createElement(HouseMapCard, { ...mapState, visitCounts })
  )
}
