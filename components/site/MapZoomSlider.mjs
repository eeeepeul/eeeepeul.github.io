'use client'

import { createElement, useEffect, useRef, useState } from 'react'

// The zoom slider along the bottom left of the map box (the supplied picture): a small square at the
// left (all the way out), a bar with a triangle handle on it, and a big square at the right (all the way
// in). The bar is filled up to the handle. It follows the map's zoom (the map says "map:zoom" with how far
// in it is, and how far it can go), and a press or a drag on the bar, or on a square, asks the map to go there
// ("map:zoom-to"). While it is dragged the handle follows the pointer; the map then catches up with it.
export function MapZoomSlider() {
  const [value, setValue] = useState(0)
  const [held, setHeld] = useState(false)
  const trackRef = useRef(null)
  const range = useRef(1)
  const drag = useRef(null)
  // where the handle was left, until the map's zoom has got there (or a few seconds have passed)
  const waiting = useRef(null)

  useEffect(() => {
    const onZoom = (event) => {
      const { z, max } = event.detail || {}
      if (!(max > 0) || !Number.isFinite(z)) return
      range.current = max
      if (drag.current) return
      const actual = Math.min(1, Math.max(0, z / max))
      const wanted = waiting.current
      if (wanted) {
        if (Math.abs(actual - wanted.value) > 0.012 && Date.now() - wanted.at < 4000) return
        waiting.current = null
      }
      setValue(actual)
    }
    window.addEventListener('map:zoom', onZoom)
    return () => window.removeEventListener('map:zoom', onZoom)
  }, [])

  const goTo = (fraction) => {
    const next = Math.min(1, Math.max(0, fraction))
    waiting.current = { value: next, at: Date.now() }
    setValue(next)
    window.dispatchEvent(new CustomEvent('map:zoom-to', { detail: { z: next * range.current } }))
  }

  const fractionAt = (event) => {
    const box = trackRef.current?.getBoundingClientRect()
    if (!box || box.width <= 0) return 0
    return (event.clientX - box.left) / box.width
  }

  const press = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    drag.current = { pointer: event.pointerId }
    setHeld(true)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // a synthetic pointer cannot be captured; the drag still follows the pointer events
    }
    goTo(fractionAt(event))
    event.preventDefault()
  }
  const move = (event) => {
    if (!drag.current || drag.current.pointer !== event.pointerId) return
    goTo(fractionAt(event))
  }
  const release = (event) => {
    if (!drag.current || drag.current.pointer !== event.pointerId) return
    drag.current = null
    setHeld(false)
  }
  const key = (event) => {
    const step = event.shiftKey ? 0.1 : 0.03
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') goTo(value + step)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') goTo(value - step)
    else if (event.key === 'Home') goTo(0)
    else if (event.key === 'End') goTo(1)
    else return
    event.preventDefault()
  }

  const percent = `${(value * 100).toFixed(2)}%`
  return createElement(
    'div',
    { className: `map-zoom-slider${held ? ' is-held' : ''}` },
    createElement('button', {
      className: 'map-zoom-slider__end map-zoom-slider__end--out',
      type: 'button',
      'aria-label': '가장 멀리 보기',
      onClick: () => goTo(0),
    }),
    createElement(
      'div',
      {
        ref: trackRef,
        className: 'map-zoom-slider__track',
        role: 'slider',
        tabIndex: 0,
        'aria-label': '지도 확대',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': Math.round(value * 100),
        onPointerDown: press,
        onPointerMove: move,
        onPointerUp: release,
        onPointerCancel: release,
        onKeyDown: key,
      },
      createElement('span', { className: 'map-zoom-slider__fill', style: { width: percent } }),
      createElement('span', { className: 'map-zoom-slider__handle', style: { left: percent } })
    ),
    createElement('button', {
      className: 'map-zoom-slider__end map-zoom-slider__end--in',
      type: 'button',
      'aria-label': '가장 가까이 보기',
      onClick: () => goTo(1),
    })
  )
}
