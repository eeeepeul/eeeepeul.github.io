'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { LOADING_BLOCKS, getFilledBlocks, getLoadingProgress } from '../../lib/loading-progress.mjs'

// The "Loading..." window of the classic Windows look (supplied picture) in the colours of the map's tool bar. It comes up
// in the middle of the room when the input key is pressed and fills its bar over a moment. Only when the bar is full is the
// character put in (onComplete, once); then the window closes itself. "Cancel" (or Esc, or the x) before that takes the input
// back: nothing is put in (onCancel). After it, they only close the window. "Done" is dimmed until the bar is full.
export function StageLoadingDialog({ job, onComplete, onCancel }) {
  const [progress, setProgress] = useState(0)
  const completed = useRef(false)

  useEffect(() => {
    if (!job) return undefined
    setProgress(0)
    completed.current = false
    const startedAt = Date.now()
    let closeTimer = null
    const tick = setInterval(() => {
      const next = getLoadingProgress(Date.now() - startedAt, true)
      setProgress(next)
      if (next >= 1 && !completed.current) {
        completed.current = true
        clearInterval(tick)
        onComplete(job)
        closeTimer = setTimeout(() => onCancel(job), 450)
      }
    }, 50)
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel(job)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(tick)
      clearTimeout(closeTimer)
      window.removeEventListener('keydown', onKey)
    }
  }, [job]) // eslint-disable-line react-hooks/exhaustive-deps

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
          onClick: () => onCancel(job),
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
        createElement('button', { type: 'button', className: 'stage-loading__key', disabled: !finished, onClick: () => onCancel(job) }, 'Done'),
        createElement('button', { type: 'button', className: 'stage-loading__key stage-loading__key--default', onClick: () => onCancel(job) }, 'Cancel')
      )
    )
  )
}
