'use client'

import { createElement, useEffect, useRef } from 'react'

// The map's tool bar can be dragged and folded, so its colour follows it: a box kept on the bar's place.
export function StageToolbarTint() {
  const ref = useRef(null)
  useEffect(() => {
    let timer = 0
    let last = ''
    const follow = () => {
      const node = ref.current
      const bar = document.querySelector('.stage-cell--map .map-gis-toolbar')
      const stage = node && node.parentElement
      if (node && bar && stage) {
        const s = stage.getBoundingClientRect()
        const b = bar.getBoundingClientRect()
        const key = [b.left - s.left, b.top - s.top, b.width, b.height, s.width].map((v) => v.toFixed(1)).join(',')
        if (key !== last && s.width > 0) {
          last = key
          node.style.left = `${((b.left - s.left) / s.width) * 100}%`
          node.style.top = `${((b.top - s.top) / s.height) * 100}%`
          node.style.width = `${(b.width / s.width) * 100}%`
          node.style.height = `${(b.height / s.height) * 100}%`
        }
      }
      timer = window.setTimeout(follow, 120)
    }
    follow()
    return () => window.clearTimeout(timer)
  }, [])
  return createElement('div', {
    ref,
    className: 'stage-tint',
    'aria-hidden': 'true',
    style: { background: '#7e806c', mixBlendMode: 'color' },
  })
}
