'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { addAccessory } from '../../lib/character-accessories.mjs'
import { brushCursor } from '../../lib/brush-cursor.mjs'
import { saveDrawing } from '../../lib/drawing-gallery.mjs'
import { getSharedDrawingStore } from '../../lib/supabase-browser.mjs'

// A small drawing board for the custom page: a low-resolution canvas shown with hard pixels,
// a few colours from the room's own palette, an eraser and a clear button.
// The board is as wide as the pad (the tools under it are 203 wide, the board 201 inside its line), so there is no
// empty space to its right: 100 columns of about 2 pixels.
const COLUMNS = 100
// The board is tall: on the second page the pad stands in box 4-1, which is 358 high at the width of 178 the pad is
// drawn at (221 wide as it is made: 178 / 221 of its size), so the pad is made 444 high, which is 188 rows of drawing
// (2 pixels each) with the tools and the input bar under them.
const ROWS = 188
const SCALE = 2
export const DRAWING_BOARD = { columns: COLUMNS, rows: ROWS, scale: SCALE }
const COLOURS = ['#1c1c1c', '#4aa3b4', '#d9392b', '#f2c94c', '#ffffff']
const PAPER = '#fbfbf7'

// How wide a drawing of `columns` squares is, as a fraction of the match in the sidebar's preview, when it is to look as
// large there as on the board. Without the match on the screen, the usual size (undefined).
export function drawnWidthOnMatch(canvas, columns, match = document.querySelector('.pixel-sidebar-character')) {
  const board = canvas?.getBoundingClientRect()
  const body = match?.getBoundingClientRect()
  if (!board?.width || !body?.width) return undefined
  return (columns * (board.width / COLUMNS)) / body.width
}

export function DrawingPad() {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)
  const [colour, setColour] = useState(0)
  const [brush, setBrush] = useState(1)
  const [sent, setSent] = useState(false)
  const [saved, setSaved] = useState(false)

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

  // What is drawn, cropped to the drawing, with the paper left transparent: its picture, its proportion and its width
  // in squares. Nothing when nothing is drawn yet.
  const cutDrawing = () => {
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
    if (maxX < 0) return null // nothing drawn yet
    const width = maxX - minX + 1
    const height = maxY - minY + 1
    const cut = document.createElement('canvas')
    cut.width = width
    cut.height = height
    cut.getContext('2d').drawImage(canvas, minX, minY, width, height, 0, 0, width, height)
    return { src: cut.toDataURL('image/png'), aspect: width / height, columns: width }
  }

  // Put what is drawn on the match. It shows on the match in the sidebar as large as it was drawn on the pad (each square
  // of the board as big there as here), so a drawing is not shrunk out of sight; it can still be moved and resized there.
  const putOnMatch = () => {
    const drawing = cutDrawing()
    if (!drawing) return
    addAccessory(drawing.src, drawing.aspect, drawnWidthOnMatch(canvasRef.current, drawing.columns))
    setSent(true)
    window.setTimeout(() => setSent(false), 1400)
  }

  // Save what is drawn on the shelf of box 4-2, where everyone can choose it.
  const save = () => {
    const drawing = cutDrawing()
    if (!drawing) return
    saveDrawing(drawing.src, drawing.aspect, getSharedDrawingStore())
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  return createElement(
    'section',
    { className: 'drawing-pad', 'aria-label': '그림판' },
    createElement('canvas', {
      ref: canvasRef,
      className: 'drawing-pad__canvas',
      width: COLUMNS,
      height: ROWS,
      // over the board the pointer is a paintbrush in the colour chosen (an eraser when the eraser is chosen)
      style: {
        width: '100%',
        height: ROWS * SCALE,
        '--brush-cursor': brushCursor(COLOURS[colour], { eraser: colour === COLOURS.length - 1 }),
      },
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
    // the bar under the tools, in two halves: input (on the match) and save (on the shelf of box 4-2)
    createElement(
      'div',
      { className: 'drawing-pad__actions' },
      createElement(
        'button',
        { type: 'button', className: `drawing-pad__input${sent ? ' is-sent' : ''}`, 'aria-label': '그린 그림을 성냥에 입히기', onClick: putOnMatch },
        sent ? 'on the match' : 'input'
      ),
      createElement(
        'button',
        { type: 'button', className: `drawing-pad__input drawing-pad__save${saved ? ' is-sent' : ''}`, 'aria-label': '그린 그림을 아래 칸에 저장하기', onClick: save },
        saved ? 'saved' : 'save'
      )
    )
  )
}
