'use client'

import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { TRACKS } from '../../lib/tracks.mjs'
import { getVolume, subscribeVolume } from '../../lib/stage-audio.mjs'
import { computePeaks, formatClock } from '../../lib/waveform.mjs'

// The CD Player window (supplied picture: the classic Windows player) in the colours of the map's tool bar. It opens in the
// middle of the room when the music key of the tool bar (box 3) is pressed (the event OPEN_EVENT), and it plays the four
// songs of the record: a title bar (drag it; _ folds the window to its bar, the square brings it back, x closes it), a menu
// (Disc: the songs, View: how the track's time is shown, Options: loop, Help), the picture of the song's sound with a line
// where it is now, the keys (play and pause, stop, the song before, a slider, the song after) and the two readings at the
// foot (the whole record's length and the song's time). Music stops when the window is closed.
export const OPEN_EVENT = 'stage:toggle-cd-player'
// told to the tool bar whenever the window opens or closes, so the music key shows pressed while the window is open
export const STATE_EVENT = 'stage:cd-player-state'

// While the site is being worked on the sound is kept silent unless NEXT_PUBLIC_PLAY_MUSIC=1 (as in StagePlayer).
const SILENT = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_PLAY_MUSIC !== '1'
const BINS = 240
const peaksCache = new Map()

async function loadPeaks(src) {
  if (peaksCache.has(src)) return peaksCache.get(src)
  const response = await fetch(assetPath(src))
  const data = await response.arrayBuffer()
  const AudioContext = window.AudioContext || window.webkitAudioContext
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(data)
    const peaks = computePeaks(buffer.getChannelData(0), BINS)
    peaksCache.set(src, peaks)
    return peaks
  } finally {
    context.close().catch(() => {})
  }
}

function drawWave(canvas, peaks, progress) {
  const context = canvas.getContext('2d')
  const { width, height } = canvas
  context.clearRect(0, 0, width, height)
  const middle = height / 2
  const barWidth = width / BINS
  context.fillStyle = '#dcdccd'
  for (let index = 0; index < BINS; index += 1) {
    const half = Math.max(1, (peaks ? peaks[index] : 0) * middle * 0.72)
    context.fillRect(index * barWidth, middle - half, Math.max(1, barWidth - 0.6), half * 2)
  }
  const at = Math.round(Math.min(1, Math.max(0, progress)) * (width - 2))
  context.fillStyle = '#f4f4ea'
  context.fillRect(at, 0, 2, height)
}

export function StageCdPlayer() {
  const [open, setOpen] = useState(false)
  const [folded, setFolded] = useState(false)
  const [menu, setMenu] = useState(null)
  const [track, setTrack] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(false)
  const [remaining, setRemaining] = useState(false)
  const [time, setTime] = useState({ now: 0, length: NaN })
  const [lengths, setLengths] = useState({})
  const [peaks, setPeaks] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  // true while the window slides back to its place before it closes (the x key)
  const [returning, setReturning] = useState(false)
  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const windowRef = useRef(null)
  const closeHomeRef = useRef(() => {})
  const loopRef = useRef(loop)
  const trackRef = useRef(track)
  loopRef.current = loop
  trackRef.current = track
  const playable = TRACKS.map((item, index) => (item.src ? index : -1)).filter((index) => index >= 0)

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: { open } }))
    // a closed window comes back in its own place, unfolded
    if (!open) {
      setOffset({ x: 0, y: 0 })
      setFolded(false)
      setMenu(null)
      setReturning(false)
    }
  }, [open])

  useEffect(() => {
    const toggle = () => setOpen((current) => !current)
    window.addEventListener(OPEN_EVENT, toggle)
    return () => window.removeEventListener(OPEN_EVENT, toggle)
  }, [])

  const choose = useCallback((index, andPlay = true) => {
    const item = TRACKS[index]
    const audio = audioRef.current
    if (!item || !item.src || !audio) return
    setTrack(index)
    setPeaks(null)
    audio.src = assetPath(item.src)
    audio.loop = false
    if (andPlay) audio.play().catch(() => setPlaying(false))
  }, [])

  // the player exists while the window is open
  useEffect(() => {
    if (!open) return undefined
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = getVolume()
    audio.muted = SILENT
    audioRef.current = audio
    const stopVolume = subscribeVolume((value) => {
      audio.volume = value
    })
    const onTime = () => setTime({ now: audio.currentTime, length: audio.duration })
    const onEnded = () => {
      if (loopRef.current) {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      const at = playable.indexOf(trackRef.current)
      const next = playable[(at + 1) % playable.length]
      if (playable.length > 1 && next !== trackRef.current) choose(next)
      else setPlaying(false)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', () => {
      onTime()
      setLengths((current) => ({ ...current, [trackRef.current]: audio.duration }))
    })
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', () => setPlaying(true))
    audio.addEventListener('pause', () => setPlaying(false))
    choose(trackRef.current, false)
    // the lengths of the other songs, for the whole record's time
    TRACKS.forEach((item, index) => {
      if (!item.src) return
      const probe = new Audio()
      probe.preload = 'metadata'
      probe.src = assetPath(item.src)
      probe.addEventListener('loadedmetadata', () => setLengths((current) => ({ ...current, [index]: probe.duration })))
    })
    return () => {
      stopVolume()
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
      setPlaying(false)
    }
  }, [open, choose]) // eslint-disable-line react-hooks/exhaustive-deps

  // the picture of the song's sound
  useEffect(() => {
    if (!open) return undefined
    const item = TRACKS[track]
    let cancelled = false
    if (item && item.src) {
      loadPeaks(item.src)
        .then((result) => {
          if (!cancelled) setPeaks(result)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [open, track])

  const progress = Number.isFinite(time.length) && time.length > 0 ? time.now / time.length : 0
  useEffect(() => {
    if (canvasRef.current && open && !folded) drawWave(canvasRef.current, peaks, progress)
  }, [peaks, progress, open, folded])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (menu) setMenu(null)
        else closeHomeRef.current()
      }
    }
    const onDown = (event) => {
      if (menu && !event.target.closest?.('.cd-player__menubar, .cd-player__drop')) setMenu(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open, menu])

  if (!open) return null

  const audio = audioRef.current
  const toggle = () => {
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }
  const stop = () => {
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setTime((current) => ({ ...current, now: 0 }))
  }
  const step = (direction) => {
    const at = playable.indexOf(track)
    if (at < 0) return
    choose(playable[(at + direction + playable.length) % playable.length], playing)
  }
  const back = () => {
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    step(-1)
  }
  const seek = (event) => {
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = (Number(event.target.value) / 1000) * audio.duration
  }
  // the x key: a window that was dragged away slides back to where it stands at first, then closes
  const closeHome = () => {
    setMenu(null)
    if (offset.x === 0 && offset.y === 0) {
      setOpen(false)
      return
    }
    setReturning(true)
    setOffset({ x: 0, y: 0 })
    window.setTimeout(() => setOpen(false), 220)
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

  closeHomeRef.current = closeHome
  const total = Object.values(lengths).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0)
  const trackTime = remaining && Number.isFinite(time.length) ? time.length - time.now : time.now
  const knownAll = TRACKS.filter((item) => item.src).every((item, index) => Number.isFinite(lengths[TRACKS.indexOf(item)]))

  const key = (className, label, onClick, children, extra = {}) =>
    createElement('button', { type: 'button', className: `cd-player__key ${className}`, 'aria-label': label, title: label, onClick, ...extra }, children)

  const menus = [
    {
      name: 'Disc',
      items: TRACKS.map((item, index) => ({
        label: `${index + 1}. ${item.title}`,
        checked: index === track,
        disabled: !item.src,
        run: () => choose(index),
      })),
    },
    { name: 'View', items: [{ label: 'Track time remaining', checked: remaining, run: () => setRemaining((value) => !value) }] },
    { name: 'Options', items: [{ label: 'Repeat the song', checked: loop, run: () => setLoop((value) => !value) }] },
    { name: 'Help', items: [{ label: 'Esc closes the window', disabled: true }, { label: 'Drag the title bar to move it', disabled: true }] },
  ]

  return createElement(
    'div',
    { className: 'cd-player-layer' },
    createElement(
      'div',
      {
        ref: windowRef,
        className: `cd-player${folded ? ' is-folded' : ''}`,
        role: 'dialog',
        'aria-label': 'CD Player',
        style: { transform: `translate(${offset.x}px, ${offset.y}px)`, transition: returning ? 'transform 200ms ease-out' : undefined },
      },
      createElement(
        'div',
        { className: 'cd-player__title', onPointerDown: beginDrag },
        createElement('span', { className: 'cd-player__disc', 'aria-hidden': 'true' }),
        createElement('span', { className: 'cd-player__name' }, 'CD Player'),
        createElement('button', { type: 'button', className: 'cd-player__wbtn cd-player__wbtn--min', 'aria-label': '접기', onClick: () => { setFolded(true); setMenu(null) } }),
        createElement('button', { type: 'button', className: 'cd-player__wbtn cd-player__wbtn--max', 'aria-label': '펴기', onClick: () => setFolded(false) }),
        createElement('button', { type: 'button', className: 'cd-player__wbtn cd-player__wbtn--close', 'aria-label': '닫기', onClick: closeHome })
      ),
      folded
        ? null
        : createElement(
            'div',
            { className: 'cd-player__body' },
            createElement(
              'div',
              { className: 'cd-player__menubar', role: 'menubar' },
              menus.map((entry) =>
                createElement(
                  'span',
                  { key: entry.name, className: 'cd-player__menu' },
                  createElement(
                    'button',
                    {
                      type: 'button',
                      role: 'menuitem',
                      'aria-haspopup': 'menu',
                      'aria-expanded': menu === entry.name,
                      className: menu === entry.name ? 'is-open' : undefined,
                      onClick: () => setMenu((current) => (current === entry.name ? null : entry.name)),
                    },
                    entry.name
                  ),
                  menu === entry.name
                    ? createElement(
                        'ul',
                        { className: 'cd-player__drop', role: 'menu' },
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
                              createElement('span', { className: 'cd-player__tick', 'aria-hidden': 'true' }, item.checked ? '✓' : ''),
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
              { className: 'cd-player__display' },
              createElement('canvas', { ref: canvasRef, className: 'cd-player__wave', width: 480, height: 200, role: 'img', 'aria-label': `${TRACKS[track]?.title ?? ''} 소리 모양` })
            ),
            createElement(
              'div',
              { className: 'cd-player__keys' },
              key('cd-player__key--play', playing ? '멈춤' : '재생', toggle, createElement('i', { className: playing ? 'is-pause' : 'is-play' })),
              key('cd-player__key--stop', '정지', stop, createElement('i', { className: 'is-stop' })),
              key('cd-player__key--back', '이전 곡', back, createElement('i', { className: 'is-back' })),
              createElement('input', {
                type: 'range',
                className: 'cd-player__slider',
                min: 0,
                max: 1000,
                value: Math.round(progress * 1000),
                onChange: seek,
                'aria-label': '재생 위치',
              }),
              key('cd-player__key--next', '다음 곡', () => step(1), createElement('i', { className: 'is-next' }))
            ),
            createElement(
              'div',
              { className: 'cd-player__status' },
              createElement('span', null, `Total Play: ${knownAll ? formatClock(total) : '--:--'} m:s`),
              createElement('span', null, `Track: ${formatClock(trackTime)} m:s`)
            )
          )
    )
  )
}
