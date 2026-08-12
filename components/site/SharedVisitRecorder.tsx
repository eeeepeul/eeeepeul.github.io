'use client'

import { useEffect } from 'react'
import { recordSharedPageVisit } from '../../lib/shared-visits.mjs'
import { getSharedVisitStore } from '../../lib/supabase-browser.mjs'

let pageLoadRecorded = false

export function SharedVisitRecorder() {
  useEffect(() => {
    if (pageLoadRecorded) return
    pageLoadRecorded = true

    void recordSharedPageVisit({
      store: getSharedVisitStore(),
      pathname: window.location.pathname,
      search: window.location.search,
      dispatch: (eventName, detail) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail }))
      },
    }).catch(() => {
      // Shared activity can reconnect without blocking the visual experience.
    })
  }, [])

  return null
}
