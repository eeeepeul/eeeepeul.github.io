'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { addAccessory } from '../../lib/character-accessories.mjs'
import { brushCursor } from '../../lib/brush-cursor.mjs'
import { BRUSH_SIZES, DEFAULT_BRUSH, createHistory, hexText, hexToHsl, hslToHex, parseHex, stepBrush } from '../../lib/drawing-tools.mjs'
import { saveDrawing } from '../../lib/drawing-gallery.mjs'
import { getSharedDrawingStore } from '../../lib/supabase-browser.mjs'

// A small drawing board for the custom page: a low-resolution canvas shown with hard pixels, and under it one row of
// tools: the colour (a field with its hex text), undo and redo (< >), the brush size (+ -) and clear; then input and save.
// The board is as wide as the pad (the tools under it are 203 wide, the board 201 inside its line), so there is no
// empty space to its right: 100 columns of about 2 pixels.
const COLUMNS = 100
// The board is tall: on the second page the pad stands in box 4-1, which is 358 high at the width of 178 the pad is
// drawn at (221 wide as it is made: 178 / 221 of its size), so the pad is made 444 high, which is 188 rows of drawing
// (2 pixels each) with the tools and the input bar under them.
const ROWS = 188
const SCALE = 2
export const DRAWING_BOARD = { columns: COLUMNS, rows: ROWS, scale: SCALE }
const START_COLOUR = '#1c1c1c'
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
  const historyRef = useRef(null)
  if (!historyRef.current) historyRef.current = createHistory()
  const [, redraw] = useState(0)
  const [colour, setColour] = useState(START_COLOUR)
  const [hex, setHex] = useState(hexText(START_COLOUR))
  // the colour chooser (the swatch opens it): its bars work on hue and lightness
  const [hsl, setHsl] = useState(() => hexToHsl(START_COLOUR))
  const [chooserOpen, setChooserOpen] = useState(false)
  const padRef = useRef(null)
  const [brushIndex, setBrushIndex] = useState(DEFAULT_BRUSH)
  const brush = BRUSH_SIZES[brushIndex]
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
    const left = x - Math.floor(brush / 2)
    const top = y - Math.floor(brush / 2)
    context.fillStyle = colour
    context.fillRect(left, top, brush, brush)
  }

  const chooseColour = (next, nextHsl = hexToHsl(next)) => {
    setColour(next)
    setHex(hexText(next))
    setHsl(nextHsl)
  }
  // the hue bar: a grey turns into a colour as soon as it is moved
  const moveHue = (h) => {
    const next = { h, s: hsl.s === 0 ? 100 : hsl.s, l: hsl.l }
    chooseColour(hslToHex(next), next)
  }
  const moveLightness = (l) => {
    const next = { ...hsl, l }
    chooseColour(hslToHex(next), next)
  }
  // the chooser closes when something else is pressed, or on Escape
  useEffect(() => {
    if (!chooserOpen) return undefined
    const away = (event) => {
      if (event.target instanceof Element && event.target.closest('.drawing-pad__chooser, .drawing-pad__swatch')) return
      setChooserOpen(false)
    }
    const escape = (event) => {
      if (event.key === 'Escape') setChooserOpen(false)
    }
    document.addEventListener('pointerdown', away)
    window.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', escape)
    }
  }, [chooserOpen])

  // Undo and redo: the board as it was is kept before each stroke (and before clearing).
  const snapshot = () => canvasRef.current.getContext('2d').getImageData(0, 0, COLUMNS, ROWS)
  const goTo = (picture) => {
    if (!picture) return
    canvasRef.current.getContext('2d').putImageData(picture, 0, 0)
    redraw((count) => count + 1)
  }
  const undo = () => goTo(historyRef.current.undo(snapshot()))
  const redo = () => goTo(historyRef.current.redo(snapshot()))

  // the usual keys, when no text is being typed: Cmd/Ctrl+Z undoes, Shift+Cmd/Ctrl+Z (or Ctrl+Y) redoes
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable]')) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) undo()
      else if ((key === 'z' && event.shiftKey) || key === 'y') redo()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
    historyRef.current.record(snapshot())
    redraw((count) => count + 1)
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
    historyRef.current.record(snapshot())
    redraw((count) => count + 1)
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
    { className: 'drawing-pad', 'aria-label': '그림판', ref: padRef },
    createElement('canvas', {
      ref: canvasRef,
      className: 'drawing-pad__canvas',
      width: COLUMNS,
      height: ROWS,
      // over the board the pointer is a paintbrush in the colour chosen (an eraser when the eraser is chosen)
      style: {
        width: '100%',
        height: ROWS * SCALE,
        '--brush-cursor': brushCursor(colour),
      },
      onPointerDown: onDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onUp,
    }),
    createElement(
      'div',
      { className: 'drawing-pad__tools' },
      // the colour: a swatch (it opens the colour chooser) and its hex text, which can be typed
      createElement(
        'label',
        { className: 'drawing-pad__colour' },
        createElement('button', {
          type: 'button',
          className: 'drawing-pad__swatch',
          style: { background: colour },
          'aria-label': '색 고르기',
          'aria-expanded': chooserOpen,
          onClick: () => setChooserOpen((open) => !open),
        }),
        createElement('input', {
          type: 'text',
          className: 'drawing-pad__hex',
          value: hex,
          maxLength: 7,
          spellCheck: false,
          'aria-label': '색 번호',
          onChange: (event) => {
            setHex(event.target.value.toUpperCase())
            const next = parseHex(event.target.value)
            if (next) {
              setColour(next)
              setHsl(hexToHsl(next))
            }
          },
          onBlur: () => setHex(hexText(colour)),
        })
      ),
      // undo and redo
      createElement(
        'span',
        { className: 'drawing-pad__arrows' },
        createElement(
          'button',
          { type: 'button', className: 'drawing-pad__arrow', 'aria-label': '되돌리기', title: '되돌리기', disabled: !historyRef.current.canUndo(), onClick: undo },
          createElement('svg', { viewBox: '0 0 8 8', 'aria-hidden': 'true' }, createElement('path', { d: 'M6 0 L6 8 L1 4 Z' }))
        ),
        createElement(
          'button',
          { type: 'button', className: 'drawing-pad__arrow', 'aria-label': '다시 앞으로', title: '다시 앞으로', disabled: !historyRef.current.canRedo(), onClick: redo },
          createElement('svg', { viewBox: '0 0 8 8', 'aria-hidden': 'true' }, createElement('path', { d: 'M2 0 L2 8 L7 4 Z' }))
        )
      ),
      createElement('span', { className: 'drawing-pad__sep', 'aria-hidden': 'true' }),
      // the brush size
      createElement(
        'span',
        { className: 'drawing-pad__sizes' },
        createElement('button', { type: 'button', className: 'drawing-pad__size', 'aria-label': '붓 크게', title: '붓 크게', disabled: brushIndex >= BRUSH_SIZES.length - 1, onClick: () => setBrushIndex((index) => stepBrush(index, 1)) }, '+'),
        createElement('button', { type: 'button', className: 'drawing-pad__size', 'aria-label': '붓 작게', title: '붓 작게', disabled: brushIndex <= 0, onClick: () => setBrushIndex((index) => stepBrush(index, -1)) }, '−')
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
    ),
    // the colour chooser, at the pad's lower left: the top bar is the hue, the bottom one the lightness
    chooserOpen
      ? createElement(
          'div',
          { className: 'drawing-pad__chooser', role: 'group', 'aria-label': '색 조절' },
          createElement('input', {
            type: 'range',
            className: 'drawing-pad__bar drawing-pad__bar--hue',
            min: 0,
            max: 360,
            value: hsl.h,
            style: { '--dot': colour },
            'aria-label': '색상',
            onChange: (event) => moveHue(Number(event.target.value)),
          }),
          createElement('input', {
            type: 'range',
            className: 'drawing-pad__bar drawing-pad__bar--light',
            min: 0,
            max: 100,
            value: hsl.l,
            style: {
              '--dot': colour,
              '--track': `linear-gradient(90deg, hsl(${hsl.h} ${hsl.s}% 0%), hsl(${hsl.h} ${hsl.s}% 50%), hsl(${hsl.h} ${hsl.s}% 100%))`,
            },
            'aria-label': '명도',
            onChange: (event) => moveLightness(Number(event.target.value)),
          })
        )
      : null
  )
}
