'use client'

import { createElement, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { addAccessory } from '../../lib/character-accessories.mjs'
import {
  getGallery,
  getSelectedDrawing,
  getServerGallery,
  selectDrawing,
  startGallery,
  subscribeGallery,
} from '../../lib/drawing-gallery.mjs'
import { getSharedDrawingStore } from '../../lib/supabase-browser.mjs'

// Box 4-2: the drawings people made on the pad (box 4-1) and saved, with the supplied doodles, set out in ruled cells as
// in the supplied picture: olive ground, black rules, each drawing worked down to coarse hard pixels. Pressing one chooses
// it (and pressing it again lets it go); the input key of box 5 (StageShelfInput) puts the chosen one on the match.
export const SHELF_BOX = { width: 178, height: 179 }
export const SHELF_COLUMNS = 4
const SHELF_MIN_ROWS = 4
// a drawing's longer side, in coarse pixels
export const SHELF_PIXELS = 22

// How many cells the ruled grid has for so many drawings: whole rows, never fewer than the box shows.
export function shelfCellCount(count, columns = SHELF_COLUMNS, minRows = SHELF_MIN_ROWS) {
  const rows = Math.max(minRows, Math.ceil(Math.max(0, count) / columns))
  return rows * columns
}

export function useGallery() {
  return useSyncExternalStore(subscribeGallery, getGallery, getServerGallery)
}

// A drawing worked down to a few coarse pixels: drawn small, edges made hard (a pixel is wholly there or not),
// and shown large without smoothing.
function PixelPicture({ src, aspect }) {
  const ref = useRef(null)
  const wide = aspect >= 1
  const columns = Math.max(1, Math.round(wide ? SHELF_PIXELS : SHELF_PIXELS * aspect))
  const rows = Math.max(1, Math.round(wide ? SHELF_PIXELS / aspect : SHELF_PIXELS))
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    let live = true
    const image = new Image()
    image.onload = () => {
      if (!live) return
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.clearRect(0, 0, columns, rows)
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, 0, 0, columns, rows)
      try {
        const data = context.getImageData(0, 0, columns, rows)
        for (let index = 0; index < data.data.length; index += 4) {
          const alpha = data.data[index + 3]
          if (alpha < 90) {
            data.data[index + 3] = 0
            continue
          }
          // un-premultiplied by the canvas already; a hard edge, and the colour a little stronger
          data.data[index + 3] = 255
          for (let channel = 0; channel < 3; channel += 1) {
            const value = data.data[index + channel]
            data.data[index + channel] = value < 128 ? Math.max(0, value - 24) : Math.min(255, value + 12)
          }
        }
        context.putImageData(data, 0, 0)
      } catch {
        // the picture stays smooth if the browser will not give its pixels
      }
    }
    image.src = src
    return () => {
      live = false
    }
  }, [src, columns, rows])
  return createElement('canvas', { ref, className: 'drawing-shelf__picture', width: columns, height: rows, 'aria-hidden': true })
}

export function StageDrawingShelf() {
  const { drawings, selectedId } = useGallery()
  useEffect(() => startGallery(getSharedDrawingStore()), [])
  const cells = shelfCellCount(drawings.length)

  return createElement(
    'div',
    { className: 'drawing-shelf', role: 'listbox', 'aria-label': '저장된 그림' },
    Array.from({ length: cells }, (_, index) => {
      const drawing = drawings[index]
      if (!drawing) return createElement('span', { key: `empty-${index}`, className: 'drawing-shelf__cell' })
      const chosen = drawing.id === selectedId
      return createElement(
        'button',
        {
          key: drawing.id,
          type: 'button',
          role: 'option',
          className: `drawing-shelf__cell drawing-shelf__item${chosen ? ' is-selected' : ''}`,
          'aria-selected': chosen,
          'aria-label': drawing.seed ? `그림 ${index + 1}` : `저장된 그림 ${index + 1}`,
          onClick: () => selectDrawing(drawing.id),
        },
        createElement(PixelPicture, { src: drawing.src, aspect: drawing.aspect })
      )
    })
  )
}

// Box 5: the input key of the shelf: the chosen drawing goes on the match in the sidebar, as wide as the match.
export function StageShelfInput() {
  const { selectedId } = useGallery()
  const [sent, setSent] = useState(false)
  const put = () => {
    const drawing = getSelectedDrawing()
    if (!drawing) return
    addAccessory(drawing.src, drawing.aspect, 1)
    setSent(true)
    window.setTimeout(() => setSent(false), 1400)
  }
  return createElement(
    'button',
    {
      type: 'button',
      className: `drawing-shelf-input${sent ? ' is-sent' : ''}`,
      'aria-label': '고른 그림을 성냥에 입히기',
      disabled: !selectedId,
      onClick: put,
    },
    sent ? 'on the match' : 'input'
  )
}
