'use client'

import { Fragment, createElement, useEffect, useState } from 'react'
import {
  HOUSE_VISIT_STORAGE_KEY,
  countRecentHouseVisits,
  loadHouseVisits,
} from '../../lib/house-visits.mjs'
import { HouseDistanceCard, DEFAULT_HOUSE_DISTANCES } from './HouseDistanceCard.mjs'
import { HouseMapCard } from './HouseMapCard.mjs'

const ACTIVITY_ENDPOINT = process.env.NEXT_PUBLIC_VISITOR_ACTIVITY_ENDPOINT || ''
const HOUSE_VISIT_REFRESH_MS = 5_000
const EMPTY_VISIT_COUNTS = { house1: 0, house2: 0, house3: 0, house4: 0 }

export function HouseMapSection() {
  const [mapState, setMapState] = useState({
    distances: DEFAULT_HOUSE_DISTANCES,
    houseIndex: 0,
  })
  const [visitCounts, setVisitCounts] = useState(EMPTY_VISIT_COUNTS)

  useEffect(() => {
    let isMounted = true

    const refreshVisits = () => {
      const nowMs = Date.now()
      void loadHouseVisits({
        endpoint: ACTIVITY_ENDPOINT,
        storage: window.localStorage,
        nowMs,
      }).then((visits) => {
        if (isMounted) setVisitCounts(countRecentHouseVisits(visits, Date.now()))
      })
    }
    const handleStorage = (event) => {
      if (!event || event.key === HOUSE_VISIT_STORAGE_KEY) refreshVisits()
    }

    refreshVisits()
    const refreshTimer = window.setInterval(refreshVisits, HOUSE_VISIT_REFRESH_MS)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('epeul:house-visits', refreshVisits)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('epeul:house-visits', refreshVisits)
    }
  }, [])

  return createElement(
    Fragment,
    null,
    createElement(HouseDistanceCard, { onStateChange: setMapState }),
    createElement(HouseMapCard, { ...mapState, visitCounts })
  )
}
