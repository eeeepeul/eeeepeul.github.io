'use client'

import { useEffect } from 'react'
import { recordHouseVisitFromSearch } from '../../lib/house-visits.mjs'

const ACTIVITY_ENDPOINT = process.env.NEXT_PUBLIC_VISITOR_ACTIVITY_ENDPOINT || ''
let pageLoadRecorded = false

export function HouseVisitRecorder() {
  useEffect(() => {
    if (pageLoadRecorded) return
    pageLoadRecorded = true

    void recordHouseVisitFromSearch({
      search: window.location.search,
      endpoint: ACTIVITY_ENDPOINT,
      storage: window.localStorage,
    }).then(() => {
      window.dispatchEvent(new Event('epeul:house-visits'))
    })
  }, [])

  return null
}
