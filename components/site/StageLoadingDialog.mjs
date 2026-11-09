'use client'

import { createElement, useEffect, useState } from 'react'
import { LOADING_BLOCKS, getFilledBlocks, getLoadingProgress } from '../../lib/loading-progress.mjs'

// The "Loading..." window of the classic Windows look (supplied picture) in the colours of the map's tool bar. It comes up
// in the middle of the room when a character is put in with the input key, fills its bar while the job runs (the job is
// the promise it is given: the character being recorded) and closes itself a moment after it is done. "Cancel" (or Esc, or
// the x) closes it at once; the character stays in the room either way. "Done" is dimmed until the bar is full.
export function StageLoadingDialog({ job, onClose }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!job) return undefined
    setProgress(0)
    const startedAt = Date.now()
    let settled = false
    let closeTimer = null
    job.promise.then(
      () => {
        settled = true
      },
      () => {
        settled = true
      }
    )
    const tick = setInterval(() => {
      const next = getLoadingProgress(Date.now() - startedAt, settled)
      setProgress(next)
      if (next >= 1 && !closeTimer) {
        clearInterval(tick)
        closeTimer = setTimeout(onClose, 450)
      }
    }, 50)
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(tick)
      clearTimeout(closeTimer)
      window.removeEventListener('keydown', onKey)
    }
  }, [job, onClose])

  if (!job) return null
  const filled = getFilledBlocks(progress)
  const finished = progress >= 1

  return createElement(
    'div',
    { className: 'stage-loading' },
    createElement(
      'div',
      { className: 'stage-loading__window', role: 'dialog', 'aria-label': '불러오는 중' },
      createElement(
        'div',
        { className: 'stage-loading__title' },
        createElement('button', {
          type: 'button',
          className: 'stage-loading__x',
          'aria-label': '닫기',
          onClick: onClose,
        })
      ),
      createElement('p', { className: 'stage-loading__text' }, 'Loading...'),
      createElement(
        'div',
        {
          className: 'stage-loading__bar',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': Math.round(progress * 100),
        },
        Array.from({ length: LOADING_BLOCKS }, (_, index) =>
          createElement('i', { key: index, className: index < filled ? 'is-lit' : undefined })
        )
      ),
      createElement(
        'div',
        { className: 'stage-loading__keys' },
        createElement('button', { type: 'button', className: 'stage-loading__key', disabled: !finished, onClick: onClose }, 'Done'),
        createElement('button', { type: 'button', className: 'stage-loading__key stage-loading__key--default', onClick: onClose }, 'Cancel')
      )
    )
  )
}
