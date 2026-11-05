'use client'

import { createElement, useEffect, useState } from 'react'

// A page of its own inside a box (an iframe), asked for only when the planet is on the screen (the
// "stage:planet-ready" event of the map), so that it does not take the line from the planet's pictures
// on the first screen. If the planet never says so (no WebGL, a slow line), it is asked for after
// LATEST_MS anyway.
const LATEST_MS = 7000

export function StageLateFrame({ src, ...props }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const go = () => setReady(true)
    window.addEventListener('stage:planet-ready', go, { once: true })
    const timer = window.setTimeout(go, LATEST_MS)
    return () => {
      window.removeEventListener('stage:planet-ready', go)
      window.clearTimeout(timer)
    }
  }, [])

  return createElement('iframe', { ...props, src: ready ? src : undefined })
}
