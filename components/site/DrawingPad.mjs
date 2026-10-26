'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { addAccessory } from '../../lib/character-accessories.mjs'

// A small drawing board for the custom page: a low-resolution canvas shown with hard pixels,
// a few colours from the room's own palette, an eraser and a clear button.
const COLUMNS = 84
const ROWS = 60
const SCALE = 2
const COLOURS = ['#1c1c1c', '#4aa3b4', '#d9392b', '#f2c94c', '#ffffff']
const PAPER = '#fbfbf7'

export function DrawingPad() {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)
  const [colour, setColour] = useState(0)
  const [brush, setBrush] = useState(1)
  const [sent, setSent] = useState(false)

  const cellAt = (event) => {
    const box = canvasRef.current.getBoundingClientRect()
    return [
      Math.min(COLUMNS - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * COLUMNS))),
      Math.min(ROWS - 1, Math.max(0, Math.floor(((event.clientY - box.top) / box.height) * ROWS))),
    ]
  }

  const dab = (x, y) => {
    const context = canvasRef.current.getContext('2d')
    const erasing = colour === COLOURS.length - 1
    const left = x - Math.floor(brush / 2)
    const top = y - Math.floor(brush / 2)
    if (erasing) {
      context.clearRect(left, top, brush, brush)
    } else {
      context.fillStyle = COLOURS[colour]
      context.fillRect(left, top, brush, brush)
    }
  }

  // A line of single cells between two points, so a quick stroke has no gaps.
  const line = (from, to) => {
    let [x0, y0] = from
    const [x1, y1] = to
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let error = dx + dy
    for (;;) {
      dab(x0, y0)
      if (x0 === x1 && y0 === y1) break
      const doubled = 2 * error
      if (doubled >= dy) {
        error += dy
        x0 += sx
      }
      if (doubled <= dx) {
        error += dx
        y0 += sy
      }
    }
  }

  const onDown = (event) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      canvasRef.current.setPointerCapture(event.pointerId)
    } catch {
      // not every pointer can be captured; drawing still works while it stays over the board
    }
    drawingRef.current = true
    const cell = cellAt(event)
    lastRef.current = cell
    dab(cell[0], cell[1])
  }
  const onMove = (event) => {
    if (!drawingRef.current) return
    const cell = cellAt(event)
    line(lastRef.current, cell)
    lastRef.current = cell
  }
  const onUp = () => {
    drawingRef.current = false
    lastRef.current = null
  }
  const clear = () => {
    canvasRef.current.getContext('2d').clearRect(0, 0, COLUMNS, ROWS)
  }

  // Put what is drawn on the match: cropped to the drawing, with the paper left transparent.
  const putOnMatch = () => {
    const canvas = canvasRef.current
    const data = canvas.getContext('2d').getImageData(0, 0, COLUMNS, ROWS)
    let minX = COLUMNS
    let minY = ROWS
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLUMNS; x += 1) {
        if (data.data[(y * COLUMNS + x) * 4 + 3] > 0) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }
    if (maxX < 0) return // nothing drawn yet
    const width = maxX - minX + 1
    const height = maxY - minY + 1
    const cut = document.createElement('canvas')
    cut.width = width
    cut.height = height
    cut.getContext('2d').drawImage(canvas, minX, minY, width, height, 0, 0, width, height)
    addAccessory(cut.toDataURL('image/png'), width / height)
    setSent(true)
    window.setTimeout(() => setSent(false), 1400)
  }

  return createElement(
    'section',
    { className: 'drawing-pad', 'aria-label': '그림판' },
    createElement('canvas', {
      ref: canvasRef,
      className: 'drawing-pad__canvas',
      width: COLUMNS,
      height: ROWS,
      style: { width: COLUMNS * SCALE, height: ROWS * SCALE },
      onPointerDown: onDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onUp,
    }),
    createElement(
      'div',
      { className: 'drawing-pad__tools' },
      COLOURS.map((value, index) =>
        createElement('button', {
          key: value,
          type: 'button',
          className: `drawing-pad__swatch${colour === index ? ' is-selected' : ''}${index === COLOURS.length - 1 ? ' is-eraser' : ''}`,
          style: { background: value },
          'aria-label': index === COLOURS.length - 1 ? '지우개' : `색 ${index + 1}`,
          'aria-pressed': colour === index,
          title: index === COLOURS.length - 1 ? '지우개' : undefined,
          onClick: () => setColour(index),
        })
      ),
      createElement('span', { className: 'drawing-pad__sep', 'aria-hidden': 'true' }),
      [1, 3].map((size) =>
        createElement('button', {
          key: size,
          type: 'button',
          className: `drawing-pad__size${brush === size ? ' is-selected' : ''}`,
          'aria-label': size === 1 ? '가는 붓' : '굵은 붓',
          'aria-pressed': brush === size,
          onClick: () => setBrush(size),
        }, createElement('i', { style: { width: size * 3, height: size * 3 } }))
      ),
      createElement('button', { type: 'button', className: 'drawing-pad__clear', 'aria-label': '모두 지우기', onClick: clear }, 'clear')
    ),
    createElement(
      'button',
      { type: 'button', className: `drawing-pad__input${sent ? ' is-sent' : ''}`, 'aria-label': '그린 그림을 성냥에 입히기', onClick: putOnMatch },
      sent ? 'on the match' : 'input'
    )
  )
}
