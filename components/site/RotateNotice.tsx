'use client'

import { useEffect, useState } from 'react'
import { startForcedLandscape } from '../../lib/force-landscape.mjs'

// A phone held upright: ask for it to be turned for three seconds, then show the stage itself turned a
// quarter turn so that it fills the screen. Turning the phone back to landscape ends it.
const UPRIGHT_PHONE = '(max-width: 800px) and (orientation: portrait) and (pointer: coarse)'
const NOTICE_MS = 3000

export function RotateNotice() {
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    if (!document.querySelector('.stage-shell')) return undefined
    const query = window.matchMedia(UPRIGHT_PHONE)
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopTurn: (() => void) | undefined

    const reset = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
      if (stopTurn) stopTurn()
      stopTurn = undefined
      setShowNotice(false)
    }
    const update = () => {
      reset()
      if (!query.matches) return
      setShowNotice(true)
      timer = setTimeout(() => {
        setShowNotice(false)
        stopTurn = startForcedLandscape()
      }, NOTICE_MS)
    }

    update()
    query.addEventListener('change', update)
    return () => {
      query.removeEventListener('change', update)
      reset()
    }
  }, [])

  if (!showNotice) return null
  return (
    <div className="rotate-notice" role="alert">
      <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <rect x="22" y="8" width="20" height="36" rx="3" />
        <path d="M14 52a22 22 0 0 0 36 0" />
        <path d="M50 46v6h-6" />
      </svg>
      <p>화면을 가로로 돌려서 봐 주세요</p>
    </div>
  )
}
