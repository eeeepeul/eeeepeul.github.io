'use client'

import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { BRUSH_SIZES } from '../../lib/drawing-tools.mjs'
import { getBoard, subscribeBoard } from '../../lib/drawing-board.mjs'
import { PAINT_PALETTE, ellipseCells, floodFill, hexToRgba, lineCells, rectCells } from '../../lib/paint-tools.mjs'

// The large Paint window (supplied picture: the classic Windows Paint) in the colours of the map's tool bar. It opens in the
// middle of the room when the key at the upper right of the small drawing pad (box 4-1) is pressed (the event TOGGLE_EVENT),
// and it draws on the very board of the pad (lib/drawing-board.mjs): what is drawn in the window shows on the pad, what is on
// the pad is there in the window, and undo, input and save are the pad's own. Each square of the board is CELL pixels here.
// Tools (the two columns at the left): pencil, eraser, fill, colour picker, line, rectangle, ellipse, the filled rectangle and
// the filled ellipse, and undo; the brush sizes under them; the 28 colours under the board.
export const TOGGLE_EVENT = 'stage:toggle-paint'
const CELL = 4

const ICONS = {
  pencil: [['path', { d: 'M4 20l1.2-5L16 4.2 19.8 8 9 18.8zM14 6l4 4' }]],
  eraser: [['path', { d: 'M4 15l8-9 8 6-6 7H8zM9 10l7 5' }]],
  fill: [['path', { d: 'M5 11l7-7 7 7-6 6zM12 4l1.5 5M20 14c1.4 2 1.4 3.4 0 4.4-1.4-1-1.4-2.4 0-4.4z' }]],
  picker: [['path', { d: 'M14 4l6 6-3 1.2L9 19.2H5v-4l8-8zM13 7l4 4' }]],
  line: [['path', { d: 'M4 20L20 4' }]],
  rect: [['rect', { x: 5, y: 7, width: 14, height: 10 }]],
  ellipse: [['ellipse', { cx: 12, cy: 12, rx: 8, ry: 5.5 }]],
  rectFilled: [['rect', { x: 5, y: 7, width: 14, height: 10, fill: 'currentColor' }]],
  ellipseFilled: [['ellipse', { cx: 12, cy: 12, rx: 8, ry: 5.5, fill: 'currentColor' }]],
  undo: [['path', { d: 'M9 6L4 11l5 5M4 11h10a5 5 0 0 1 0 10h-3' }]],
}
const TOOLS = [
  { id: 'pencil', label: '연필' },
  { id: 'eraser', label: '지우개' },
  { id: 'fill', label: '채우기' },
  { id: 'picker', label: '색 집기' },
  { id: 'line', label: '선' },
  { id: 'rect', label: '네모' },
  { id: 'ellipse', label: '동그라미' },
  { id: 'rectFilled', label: '채운 네모' },
  { id: 'ellipseFilled', label: '채운 동그라미' },
  { id: 'undo', label: '되돌리기', action: true },
]

function Icon({ name }) {
  return createElement(
    'svg',
    { className: 'paint__icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' },
    ICONS[name].map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs }))
  )
}

export function StagePaint() {
  const [open, setOpen] = useState(false)
  const [folded, setFolded] = useState(false)
  const [menu, setMenu] = useState(null)
  const [tool, setTool] = useState('pencil')
  const [grid, setGrid] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [hint, setHint] = useState('')
  const [, refresh] = useState(0)
  const canvasRef = useRef(null)
  const windowRef = useRef(null)
  const dragRef = useRef(null)
  const toolRef = useRef(tool)
  toolRef.current = tool

  useEffect(() => {
    const toggle = () => setOpen((current) => !current)
    window.addEventListener(TOGGLE_EVENT, toggle)
    return () => window.removeEventListener(TOGGLE_EVENT, toggle)
  }, [])

  // a closed window comes back in its own place, unfolded
  useEffect(() => {
    if (!open) {
      setOffset({ x: 0, y: 0 })
      setFolded(false)
      setMenu(null)
    }
  }, [open])

  const board = () => {
    const entry = getBoard()
    return entry ? entry.now() : null
  }

  // the window shows the pad's board: copied over after each change
  const show = useCallback(() => {
    const target = canvasRef.current
    const source = board()?.canvas
    if (!target || !source) return
    const context = target.getContext('2d')
    context.clearRect(0, 0, target.width, target.height)
    context.drawImage(source, 0, 0)
  }, [])
  useEffect(() => {
    if (!open) return undefined
    show()
    return subscribeBoard(() => {
      show()
      refresh((count) => count + 1)
    })
  }, [open, show])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (menu) setMenu(null)
        else setOpen(false)
      }
    }
    const onDown = (event) => {
      if (menu && !event.target.closest?.('.paint__menubar')) setMenu(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open, menu])

  if (!open) return null

  const current = board()
  const colour = current ? current.colour : '#1c1c1c'

  const cellAt = (event) => {
    const box = canvasRef.current.getBoundingClientRect()
    const { columns, rows } = current
    return [
      Math.min(columns - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * columns))),
      Math.min(rows - 1, Math.max(0, Math.floor(((event.clientY - box.top) / box.height) * rows))),
    ]
  }

  const dab = (context, x, y, size, erase) => {
    const left = x - Math.floor(size / 2)
    const top = y - Math.floor(size / 2)
    if (erase) context.clearRect(left, top, size, size)
    else {
      context.fillStyle = current.colour
      context.fillRect(left, top, size, size)
    }
  }
  const stroke = (context, cells, size, erase) => cells.forEach(([x, y]) => dab(context, x, y, size, erase))

  const shapeCells = (kind, a, b) => {
    if (kind === 'line') return lineCells(a[0], a[1], b[0], b[1])
    if (kind === 'rect') return rectCells(a[0], a[1], b[0], b[1])
    if (kind === 'rectFilled') return rectCells(a[0], a[1], b[0], b[1], true)
    if (kind === 'ellipse') return ellipseCells(a[0], a[1], b[0], b[1])
    return ellipseCells(a[0], a[1], b[0], b[1], true)
  }

  const onDown = (event) => {
    if (!current) return
    event.preventDefault()
    const kind = toolRef.current
    const cell = cellAt(event)
    const context = current.canvas.getContext('2d')
    const size = BRUSH_SIZES[current.brushIndex]
    if (kind === 'picker') {
      const pixel = context.getImageData(cell[0], cell[1], 1, 1).data
      if (pixel[3] > 0) current.setColour(`#${[0, 1, 2].map((i) => pixel[i].toString(16).padStart(2, '0')).join('')}`)
      setTool('pencil')
      return
    }
    try {
      canvasRef.current.setPointerCapture(event.pointerId)
    } catch {
      // drawing still works while the pointer stays over the board
    }
    current.record()
    if (kind === 'fill') {
      const picture = context.getImageData(0, 0, current.columns, current.rows)
      floodFill(picture.data, current.columns, current.rows, cell[0], cell[1], hexToRgba(current.colour))
      context.putImageData(picture, 0, 0)
      show()
      return
    }
    if (kind === 'pencil' || kind === 'eraser') {
      dragRef.current = { kind, last: cell }
      dab(context, cell[0], cell[1], kind === 'eraser' ? size * 2 : size, kind === 'eraser')
    } else {
      dragRef.current = { kind, start: cell, base: context.getImageData(0, 0, current.columns, current.rows) }
    }
    show()
  }

  const onMove = (event) => {
    if (!current) return
    const cell = cellAt(event)
    setHint(`${cell[0]}, ${cell[1]}`)
    const drag = dragRef.current
    if (!drag) return
    const context = current.canvas.getContext('2d')
    const size = BRUSH_SIZES[current.brushIndex]
    if (drag.kind === 'pencil' || drag.kind === 'eraser') {
      stroke(context, lineCells(drag.last[0], drag.last[1], cell[0], cell[1]), drag.kind === 'eraser' ? size * 2 : size, drag.kind === 'eraser')
      drag.last = cell
    } else {
      context.putImageData(drag.base, 0, 0)
      stroke(context, shapeCells(drag.kind, drag.start, cell), size, false)
    }
    show()
  }

  const onUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    window.requestAnimationFrame(() => {
      show()
      refresh((count) => count + 1)
    })
    // the pad is told too (its own undo keys and the picture it shows)
    const entry = getBoard()
    if (entry) entry.now().record && refresh((count) => count + 1)
  }

  const beginDrag = (event) => {
    if (event.target.closest('button')) return
    const box = windowRef.current.getBoundingClientRect()
    const scale = box.width / windowRef.current.offsetWidth || 1
    const start = { x: event.clientX, y: event.clientY, from: offset }
    const move = (moveEvent) =>
      setOffset({ x: start.from.x + (moveEvent.clientX - start.x) / scale, y: start.from.y + (moveEvent.clientY - start.y) / scale })
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  const pickTool = (item) => {
    if (item.action) {
      if (current && current.canUndo) current.undo()
      return
    }
    setTool(item.id)
  }

  const menus = [
    {
      name: 'File',
      items: [
        { label: 'Input (on the match)', run: () => current && current.putOnMatch() },
        { label: 'Save (on the shelf)', run: () => current && current.save() },
        { label: 'Close', run: () => setOpen(false) },
      ],
    },
    {
      name: 'Edit',
      items: [
        { label: 'Undo', disabled: !current || !current.canUndo, run: () => current && current.undo() },
        { label: 'Redo', disabled: !current || !current.canRedo, run: () => current && current.redo() },
      ],
    },
    { name: 'View', items: [{ label: 'Pixel grid', checked: grid, run: () => setGrid((value) => !value) }] },
    { name: 'Image', items: [{ label: 'Clear Image', run: () => current && current.clear() }] },
    {
      name: 'Options',
      items: BRUSH_SIZES.map((size, index) => ({
        label: `Brush ${size} square${size > 1 ? 's' : ''}`,
        checked: current && current.brushIndex === index,
        run: () => current && current.setBrushIndex(index),
      })),
    },
    { name: 'Help', items: [{ label: 'Esc closes the window', disabled: true }, { label: 'Drag the title bar to move it', disabled: true }] },
  ]

  return createElement(
    'div',
    { className: 'paint-layer' },
    createElement(
      'div',
      {
        ref: windowRef,
        className: `paint${folded ? ' is-folded' : ''}`,
        role: 'dialog',
        'aria-label': 'untitled - Paint',
        style: { transform: `translate(${offset.x}px, ${offset.y}px)` },
      },
      createElement(
        'div',
        { className: 'paint__title', onPointerDown: beginDrag },
        createElement('span', { className: 'paint__brushmark', 'aria-hidden': 'true' }),
        createElement('span', { className: 'paint__name' }, 'untitled - Paint'),
        createElement('button', { type: 'button', className: 'paint__wbtn paint__wbtn--min', 'aria-label': '접기', onClick: () => { setFolded(true); setMenu(null) } }),
        createElement('button', { type: 'button', className: 'paint__wbtn paint__wbtn--max', 'aria-label': '펴기', onClick: () => setFolded(false) }),
        createElement('button', { type: 'button', className: 'paint__wbtn paint__wbtn--close', 'aria-label': '닫기', onClick: () => setOpen(false) })
      ),
      folded
        ? null
        : createElement(
            'div',
            { className: 'paint__body' },
            createElement(
              'div',
              { className: 'paint__menubar', role: 'menubar' },
              menus.map((entry) =>
                createElement(
                  'span',
                  { key: entry.name, className: 'paint__menu' },
                  createElement(
                    'button',
                    {
                      type: 'button',
                      role: 'menuitem',
                      'aria-haspopup': 'menu',
                      'aria-expanded': menu === entry.name,
                      className: menu === entry.name ? 'is-open' : undefined,
                      onClick: () => setMenu((now) => (now === entry.name ? null : entry.name)),
                    },
                    entry.name
                  ),
                  menu === entry.name
                    ? createElement(
                        'ul',
                        { className: 'paint__drop', role: 'menu' },
                        entry.items.map((item) =>
                          createElement(
                            'li',
                            { key: item.label, role: 'none' },
                            createElement(
                              'button',
                              {
                                type: 'button',
                                role: 'menuitem',
                                disabled: item.disabled,
                                onClick: () => {
                                  item.run?.()
                                  setMenu(null)
                                },
                              },
                              createElement('span', { className: 'paint__tick', 'aria-hidden': 'true' }, item.checked ? '✓' : ''),
                              item.label
                            )
                          )
                        )
                      )
                    : null
                )
              )
            ),
            createElement(
              'div',
              { className: 'paint__work' },
              createElement(
                'div',
                { className: 'paint__side' },
                createElement(
                  'div',
                  { className: 'paint__tools' },
                  TOOLS.map((item) =>
                    createElement(
                      'button',
                      {
                        key: item.id,
                        type: 'button',
                        className: `paint__tool${tool === item.id && !item.action ? ' is-pressed' : ''}`,
                        'aria-label': item.label,
                        'aria-pressed': item.action ? undefined : tool === item.id,
                        title: item.label,
                        disabled: item.action && (!current || !current.canUndo),
                        onClick: () => pickTool(item),
                        onPointerEnter: () => setHint(item.label),
                      },
                      createElement(Icon, { name: item.id })
                    )
                  )
                ),
                createElement(
                  'div',
                  { className: 'paint__sizes', role: 'group', 'aria-label': '붓 크기' },
                  BRUSH_SIZES.map((size, index) =>
                    createElement(
                      'button',
                      {
                        key: size,
                        type: 'button',
                        className: `paint__size${current && current.brushIndex === index ? ' is-pressed' : ''}`,
                        'aria-label': `붓 ${size}칸`,
                        title: `붓 ${size}칸`,
                        onClick: () => current && current.setBrushIndex(index),
                      },
                      createElement('i', { style: { width: Math.min(14, 2 + size * 1.6), height: Math.min(14, 2 + size * 1.6) } })
                    )
                  )
                )
              ),
              createElement(
                'div',
                { className: 'paint__sheet' },
                createElement('canvas', {
                  ref: canvasRef,
                  className: `paint__canvas${grid ? ' has-grid' : ''}`,
                  width: current ? current.columns : 100,
                  height: current ? current.rows : 188,
                  style: { width: (current ? current.columns : 100) * CELL, height: (current ? current.rows : 188) * CELL },
                  onPointerDown: onDown,
                  onPointerMove: onMove,
                  onPointerUp: onUp,
                  onPointerCancel: onUp,
                  onPointerLeave: () => setHint(''),
                })
              )
            ),
            createElement(
              'div',
              { className: 'paint__palette' },
              createElement(
                'span',
                { className: 'paint__now', title: '지금 색' },
                createElement('i', { style: { background: colour } })
              ),
              createElement(
                'div',
                { className: 'paint__colours', role: 'group', 'aria-label': '색' },
                PAINT_PALETTE.map((hex) =>
                  createElement('button', {
                    key: hex,
                    type: 'button',
                    className: `paint__colour${colour.toLowerCase() === hex ? ' is-pressed' : ''}`,
                    style: { background: hex },
                    'aria-label': hex,
                    title: hex,
                    onClick: () => current && current.setColour(hex),
                  })
                )
              )
            ),
            createElement(
              'div',
              { className: 'paint__status' },
              createElement('span', null, hint || 'For Help, press the Help menu.'),
              createElement('span', null, current ? `${current.columns} x ${current.rows}` : '')
            )
          )
    )
  )
}
