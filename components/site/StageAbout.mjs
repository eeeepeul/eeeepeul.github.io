'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// Cell 3: "Description of Epeul's Data". A cover picture, a tree of folders that open and close
// (a box with a dash opens onto its children, a box with a plus is closed), and the text below.
// Pressing a name selects it and the name shows at the foot. All sizes are in the units of the
// supplied picture (650 wide), scaled with the cell through --u in the stylesheet.
// The four songs of mooeemee, and what each is about (shown in the text under the tree when its name is pressed).
const SONGS = {
  '9+1': '완성의 순간보다 그 순간을 가능하게 한 준비와 견딤의 시간에 주목한다. 숫자 10이 완성을 의미한다면, 9는 그에 이르기까지의 긴 과정이며 1은 꽃이 피어 있는 짧은 찰나를 상징한다.',
  'if and only if': '관계와 기억을 통해 형성되는 존재의 의미를 탐구한다. 누군가의 존재로 비로소 발견되는 자신의 모습과, 특정한 기억에 의해서만 존재하는 감정을 이야기한다.',
  saffron: '지나간 것이 남기는 희미한 흔적과 감정의 잔향을 담고 있다. 강렬하지 않지만 오래도록 남아 있는 기억처럼, 사라진 이후에도 쉽게 식지 않는 감정의 온도를 표현한다.',
  'a&d': '나타남과 사라짐(Appear and Disappear)을 의미하는 동시에, 또 다른 이어짐을 뜻하는 ‘and’의 의미를 담고 있다. 소멸을 단순한 끝이 아닌, 또 다른 감정과 존재가 머물고 이어질 수 있는 여백으로 해석한다.',
}

const TREE = {
  id: 'epeul',
  label: 'epeul',
  kids: [
    {
      id: 'mooeemee',
      label: 'mooeemee',
      kids: [
        {
          id: 'a',
          label: '9+1',
          text: SONGS['9+1'],
          kids: [
            { id: 'a1', label: 'explain' },
            { id: 'a2', label: 'explain' },
            { id: 'a3', label: 'explain' },
            { id: 'a4', label: 'explain' },
          ],
        },
        { id: 'b', label: 'if and only if', text: SONGS['if and only if'], kids: [] },
        { id: 'c', label: 'saffron', text: SONGS.saffron, kids: [] },
        { id: 'd', label: 'a&d', text: SONGS['a&d'], kids: [] },
      ],
    },
  ],
}

// The second face ("2면") of the cell, the one a swipe to the left turns up.
const NOTE = [
  '안녕하세요. VJ를 하고있는 이플[EPEUL]입니다. 저는 딥하우스를 기반으로 소리와 이미지를 다루며, 말로 표현되기 전부터 존재하는 마음에 주목합니다.',
  '제 작업은 ‘화무십일홍’, 열흘 붉은 꽃은 없다는 말에서 출발합니다. 꽃이 피어 있는 순간을 가능하게 한 시간은 훨씬 길다는 점에서 저는 꽃이 있기 전부터 자리를 지켜온 잎과, 눈에 띄지 않는 동안에도 자라고 있던 것들을 바라봅니다.',
  '사람의 마음도 이와 닮아 있습니다. 감정은 말이 되기 전에 먼저 존재하지만, 말로 옮기는 동안 달라지거나 끝내 표현을 찾지 못하기도 합니다. 저는 그렇게 남은 마음이 어디에 머물고, 어떻게 밖으로 나올 수 있는지 탐구합니다.',
  'mibalhwa house는 그 마음들을 위해 제가 사람들을 초대하는 공간입니다. 빽빽한 정보와 신호를 지나 집 안으로 들어와, 각자의 속도로 음악을 듣고 흔적을 남기는 곳입니다. 이곳의 성냥은 안에 쌓여 있던 마음이 스스로 불을 붙이는 순간을 상징합니다.',
  '첫 앨범 《무의미(mooeemee)》는 쉽게 설명되지 않는 감정과 지나쳐온 시간 속에서 아름다움을 발견하는 작업입니다. 無意味를 무의美로 다시 읽으며, 의미 없어 보였던 자신의 일부를 새롭게 마주하는 경험을 전하고 싶습니다.',
]

// A swipe to the left turns the cell like the side of a cube to the second page, and a swipe to the
// right turns it back. The cube follows the finger while it is down; on release it goes on to the
// nearer page (or the one the swipe was heading for, if it was quick).
const SNAP_DISTANCE = 0.28 // part of the cell's width a slow swipe must cover
const SNAP_SPEED = 0.45 // widths a second a quick swipe must have
const START_PIXELS = 7 // how far the pointer must move before it counts as a swipe, not a press
// Left alone, the cube turns by itself every TURN_MS, to the other face and back. A pointer over the
// cell, or a hand on it, stops that, and it starts again TURN_MS after the pointer has gone.
const TURN_MS = 10000
// the scroll mark is at its longest when the text moves this many box heights a second
const STRETCH_SPEED = 3

// The length the bar rests at, as a part of the line it can stretch along (see .about-foot__bar)
const REST_LEVEL = 0.34

// How long the typing waits after a letter (ms): quick through a word, a breath at a comma or a stop.
function typingDelay(letter) {
  const base = 20 + Math.random() * 26
  if (letter === ' ') return base * 0.6
  if (',、'.includes(letter)) return 130 + Math.random() * 70
  if ('.。!?'.includes(letter)) return 260 + Math.random() * 120
  return base
}

// The text under the tree, and the foot with the song's name and its bar. When a song is pressed
// (`run` changes) the text is typed out letter by letter, and the bar follows the typing like a level
// meter: it swings long and short, up to the right end of the line, with the rhythm of the letters (up
// at the start of a word, down at a space or a pause). Until then (and when the visitor asks for less
// motion) the whole text is shown, and the bar rests at its usual length.
function Readout({ text, name, run }) {
  const [count, setCount] = useState(text.length)
  const barRef = useRef(null)

  useEffect(() => {
    const bar = barRef.current
    const still = !run || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (still) {
      setCount(text.length)
      if (bar) {
        bar.classList.remove('is-typing')
        bar.style.removeProperty('--level')
      }
      return undefined
    }
    let index = 0
    let timer = 0
    let afterPause = true
    let level = REST_LEVEL
    setCount(0)
    if (bar) bar.classList.add('is-typing')
    const step = () => {
      index += 1
      setCount(index)
      const letter = text[index - 1]
      if (bar) {
        // where the bar is aimed at by this letter: high at the start of a word, low at a space or a
        // pause, in between inside a word; it moves part of the way there, so it swings, not jumps
        let aim
        if (letter === ' ') aim = 0.1 + Math.random() * 0.15
        else if (',.!?'.includes(letter)) aim = 0.03
        else if (afterPause) aim = 0.75 + Math.random() * 0.25
        else aim = 0.3 + Math.random() * 0.5
        level = Math.min(1, Math.max(0.03, level * 0.35 + aim * 0.65))
        bar.style.setProperty('--level', String(level))
      }
      afterPause = letter === ' ' || ',.!?'.includes(letter)
      if (index < text.length) timer = window.setTimeout(step, typingDelay(letter))
      else if (bar) {
        // done: the bar settles back to its usual length
        timer = window.setTimeout(() => {
          bar.classList.remove('is-typing')
          bar.style.removeProperty('--level')
        }, 350)
      }
    }
    timer = window.setTimeout(step, 140)
    return () => {
      window.clearTimeout(timer)
      if (bar) {
        bar.classList.remove('is-typing')
        bar.style.removeProperty('--level')
      }
    }
  }, [text, run])

  return [
    createElement(
      'p',
      { key: 'text' },
      text.slice(0, count),
      createElement('span', { className: 'about-untyped' }, text.slice(count))
    ),
    createElement(
      'div',
      { key: 'foot', className: 'about-foot' },
      createElement('span', { className: 'about-foot__name' }, name),
      createElement('i', { className: 'about-foot__play', 'aria-hidden': 'true' }),
      createElement(
        'i',
        { className: 'about-foot__bar', ref: barRef, 'aria-hidden': 'true' },
        createElement('b', { className: 'about-foot__fill' })
      )
    ),
  ]
}

function TreeNode({ node, depth, last, open, selected, onToggle, onSelect }) {
  const isOpen = open[node.id] !== false
  const leaf = !node.kids
  const children = node.kids || []
  return createElement(
    'li',
    {
      className: `about-node${last ? ' is-last' : ''}${leaf ? ' is-leaf' : ''}`,
      'data-depth': depth,
      role: 'treeitem',
      'aria-expanded': leaf ? undefined : isOpen,
      'aria-selected': selected === node.id,
    },
    createElement(
      'div',
      { className: `about-row${selected === node.id ? ' is-selected' : ''}` },
      leaf
        ? null
        : createElement(
            'button',
            {
              type: 'button',
              className: `about-toggle${isOpen ? '' : ' is-closed'}`,
              'aria-label': `${node.label} ${isOpen ? '접기' : '펼치기'}`,
              onClick: () => onToggle(node.id),
            },
            createElement('i')
          ),
      createElement('span', { className: 'about-icon', 'aria-hidden': 'true' }),
      createElement(
        'button',
        { type: 'button', className: 'about-label', onClick: () => onSelect(node) },
        node.label
      )
    ),
    !leaf && isOpen && children.length
      ? createElement(
          'ul',
          { className: 'about-kids', role: 'group' },
          children.map((child, index) =>
            createElement(TreeNode, {
              key: child.id,
              node: child,
              depth: depth + 1,
              last: index === children.length - 1,
              open,
              selected,
              onToggle,
              onSelect,
            })
          )
        )
      : null
  )
}

export function StageAbout() {
  const [open, setOpen] = useState({})
  const [selected, setSelected] = useState('a')
  const [selectedLabel, setSelectedLabel] = useState('9+1')
  const [description, setDescription] = useState(SONGS['9+1'])
  const [typed, setTyped] = useState(0)
  const [page, setPage] = useState(0)
  const [dragging, setDragging] = useState(false)
  const rootRef = useRef(null)
  const turnRef = useRef(0)
  const drag = useRef(null)
  const justDragged = useRef(false)
  const noteRef = useRef(null)
  const dotRef = useRef(null)
  const trackRef = useRef(null)

  // the scroll mark: a circle that rides down the right edge as the text is read. The faster the text
  // is scrolled, the longer it stretches (into a pill); when the scrolling stops it draws back to a circle.
  const pulse = useRef({ top: 0, time: 0, stretch: 0, frame: 0, last: 0 })
  const placeDot = () => {
    const note = noteRef.current
    const dot = dotRef.current
    if (!note || !dot) return
    const reach = note.scrollHeight - note.clientHeight
    const ratio = reach > 0 ? Math.min(1, Math.max(0, note.scrollTop / reach)) : 0
    dot.style.top = `${ratio * 100}%`
    dot.style.transform = `translateY(${-ratio * 100}%)`
    dot.style.opacity = reach > 0 ? '1' : '0'
    const state = pulse.current
    const now = performance.now()
    const dt = now - state.time
    // how far the text went, in boxes of its height a second
    const speed = state.time && dt > 0 ? (Math.abs(note.scrollTop - state.top) / Math.max(1, note.clientHeight)) * (1000 / dt) : 0
    state.top = note.scrollTop
    state.time = now
    state.stretch = Math.max(state.stretch, Math.min(1, speed / STRETCH_SPEED))
    dot.style.setProperty('--stretch', String(state.stretch))
    if (!state.frame) {
      state.last = now
      const relax = (t) => {
        const elapsed = Math.min(64, t - state.last)
        state.last = t
        state.stretch *= Math.exp(-elapsed / 220)
        if (state.stretch < 0.01) {
          state.stretch = 0
          state.frame = 0
          dot.style.setProperty('--stretch', '0')
          return
        }
        dot.style.setProperty('--stretch', String(state.stretch))
        state.frame = window.requestAnimationFrame(relax)
      }
      state.frame = window.requestAnimationFrame(relax)
    }
  }
  useEffect(() => () => window.cancelAnimationFrame(pulse.current.frame), [])
  useEffect(() => {
    placeDot()
  }, [])
  // pressing or dragging along the right edge scrolls the text (and is not a swipe of the cube)
  const onTrackDown = (event) => {
    event.stopPropagation()
    const track = trackRef.current
    const note = noteRef.current
    const move = (e) => {
      const box = track.getBoundingClientRect()
      const reach = note.scrollHeight - note.clientHeight
      note.scrollTop = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)) * reach
    }
    move(event)
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }
  const [paused, setPaused] = useState(false)

  // by itself, to the other face and back
  useEffect(() => {
    if (paused || dragging) return undefined
    const timer = window.setTimeout(() => setPage((current) => 1 - current), TURN_MS)
    return () => window.clearTimeout(timer)
  }, [page, paused, dragging])

  // the cube's turn is a number from 0 (first page) to 1 (second), set straight on the element so the
  // page is not redrawn at every pixel of the swipe
  const setTurn = (value) => {
    turnRef.current = value
    if (rootRef.current) rootRef.current.style.setProperty('--turn', String(value))
  }
  useEffect(() => {
    if (!dragging) setTurn(page)
  }, [page, dragging])

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    const box = rootRef.current.getBoundingClientRect()
    drag.current = { id: event.pointerId, x: event.clientX, width: box.width, base: turnRef.current, started: false, last: event.clientX, time: event.timeStamp, speed: 0 }
  }
  const onPointerMove = (event) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    const dx = event.clientX - d.x
    if (!d.started) {
      if (Math.abs(dx) < START_PIXELS) return
      d.started = true
      setDragging(true)
      try {
        rootRef.current.setPointerCapture(event.pointerId)
      } catch {
        // the swipe still follows the pointer events
      }
    }
    const elapsed = Math.max(1, event.timeStamp - d.time)
    d.speed = d.speed * 0.5 + (((event.clientX - d.last) / d.width) / elapsed) * 1000 * 0.5
    d.last = event.clientX
    d.time = event.timeStamp
    setTurn(Math.min(1, Math.max(0, d.base - dx / d.width)))
  }
  const finish = (event) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    if (!d.started) return
    justDragged.current = true
    window.setTimeout(() => {
      justDragged.current = false
    }, 0)
    // a leftward swipe has a negative speed and turns towards the second page
    const turn = turnRef.current
    let next = turn > 0.5 ? 1 : 0
    if (d.speed < -SNAP_SPEED) next = 1
    else if (d.speed > SNAP_SPEED) next = 0
    else if (Math.abs(turn - d.base) > SNAP_DISTANCE) next = turn > d.base ? 1 : 0
    else next = d.base > 0.5 ? 1 : 0
    setDragging(false)
    setPage(next)
    setTurn(next)
  }
  // a swipe must not also press whatever button it ended on
  const onClickCapture = (event) => {
    if (justDragged.current) {
      event.stopPropagation()
      event.preventDefault()
    }
  }

  const front = createElement(
    'div',
    { className: 'about-face about-face--front', 'aria-hidden': page === 1 },
    createElement(
      'div',
      { className: 'about-panel' },
      createElement('header', { className: 'about-title' }, "Description of Epeul's Data"),
      createElement(
        'div',
        { className: 'about-body' },
        createElement('img', {
          className: 'about-cover',
          src: assetPath('panels/epeul-cover.png'),
          alt: '',
          draggable: false,
        }),
        createElement(
          'ul',
          { className: 'about-tree', role: 'tree', 'aria-label': 'Epeul 데이터 구조' },
          createElement(TreeNode, {
            node: TREE,
            depth: 0,
            last: true,
            open,
            selected,
            onToggle: (id) => setOpen((current) => ({ ...current, [id]: current[id] === false })),
            onSelect: (node) => {
              setSelected(node.id)
              setSelectedLabel(node.label)
              // a song shows what it is about; the other names leave the text as it was
              if (node.text) {
                setDescription(node.text)
                setTyped((count) => count + 1)
              }
            },
          })
        )
      ),
      createElement(
        'div',
        { className: 'about-text' },
        createElement(Readout, { text: description, name: selectedLabel, run: typed })
      )
    )
  )

  const side = createElement(
    'div',
    { className: 'about-face about-face--side', 'aria-hidden': page === 0 },
    createElement(
      'div',
      { className: 'about-panel about-panel--note' },
      createElement('header', { className: 'about-title' }, "Description of Epeul's Data"),
      createElement(
        'div',
        { className: 'about-notewrap' },
        createElement(
          'div',
          { className: 'about-note', ref: noteRef, onScroll: placeDot },
          NOTE.map((paragraph, index) => createElement('p', { key: index }, paragraph))
        ),
        createElement(
          'div',
          { className: 'about-track', ref: trackRef, onPointerDown: onTrackDown, 'aria-hidden': 'true' },
          createElement('i', { className: 'about-dot', ref: dotRef })
        )
      )
    )
  )

  return createElement(
    'div',
    {
      ref: rootRef,
      className: `about${dragging ? ' is-dragging' : ''}`,
      style: { '--turn': 0 },
      onPointerEnter: () => setPaused(true),
      onPointerLeave: () => setPaused(false),
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onClickCapture,
    },
    createElement('div', { className: 'about-cube' }, front, side)
  )
}
