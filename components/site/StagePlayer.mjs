'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { ARTIST, TRACKS } from '../../lib/tracks.mjs'
import { getVolume, setAnalyser, subscribeVolume } from '../../lib/stage-audio.mjs'

// Cell 12: the player. An artist box, a track box with an arrow that opens the four songs of
// the record, and five buttons: back, next, play, stop, and loop. Choosing a song plays it. The
// volume follows the bars beside cell 3 (lib/stage-audio.mjs).
//
// While the site is being worked on (the local development server) the music is kept silent: the
// song still plays and is still listened to, so the frequency picture of cell 13 and the rest move
// as they would, but the sound is not sent to the speakers. On the built site it is heard as
// usual. To hear it while working, start the server with NEXT_PUBLIC_PLAY_MUSIC=1.
const SILENT = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_PLAY_MUSIC !== '1'

export function StagePlayer() {
  const audioRef = useRef(null)
  const contextRef = useRef(null)
  const analyserRef = useRef(null)
  const stateRef = useRef({ current: -1, playing: false })
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(false)

  stateRef.current = { current, playing }
  const playable = TRACKS.map((track, index) => (track.src ? index : -1)).filter((index) => index >= 0)

  const wire = () => {
    // Sound goes through an analyser so the volume can be read. Made on the first press.
    if (contextRef.current || !audioRef.current) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const context = new AudioContext()
      const source = context.createMediaElementSource(audioRef.current)
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.55
      source.connect(analyser)
      if (SILENT) {
        // heard by the analyser only: a gain of nothing stands between it and the speakers
        const mute = context.createGain()
        mute.gain.value = 0
        analyser.connect(mute)
        mute.connect(context.destination)
      } else {
        analyser.connect(context.destination)
      }
      contextRef.current = context
      analyserRef.current = analyser
      setAnalyser(analyser)
    } catch {
      // without an analyser the song still plays; the bars just stay low
    }
  }

  const load = (index, andPlay = true) => {
    const track = TRACKS[index]
    const audio = audioRef.current
    if (!track || !track.src || !audio) return
    wire()
    if (contextRef.current && contextRef.current.state === 'suspended') contextRef.current.resume()
    setCurrent(index)
    audio.src = assetPath(track.src)
    audio.loop = false
    if (andPlay) audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio
    audio.volume = getVolume()
    const stopVolume = subscribeVolume((value) => {
      audio.volume = value
    })
    const onEnded = () => {
      const { current: now } = stateRef.current
      if (loopRef.current) {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      const at = playable.indexOf(now)
      const next = playable[(at + 1) % playable.length]
      if (playable.length > 1 && at >= 0 && next !== now) load(next)
      else setPlaying(false)
    }
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('pause', () => setPlaying(false))
    audio.addEventListener('play', () => setPlaying(true))

    return () => {
      stopVolume()
      audio.pause()
      audio.removeEventListener('ended', onEnded)
      setAnalyser(null)
      if (contextRef.current) contextRef.current.close().catch(() => {})
      contextRef.current = null
      analyserRef.current = null
    }
  }, [])

  // The first song starts on its own. Browsers keep sound locked until the visitor touches the
  // page, so if the start is blocked it waits and begins on the very first press or key.
  useEffect(() => {
    if (!playable.length) return undefined
    load(playable[0])
    const events = ['pointerdown', 'keydown', 'touchstart']
    const release = () => events.forEach((name) => window.removeEventListener(name, unlock, true))
    function unlock() {
      const context = contextRef.current
      const audio = audioRef.current
      if (context && context.state === 'suspended') context.resume().catch(() => {})
      if (audio && audio.paused) audio.play().catch(() => {})
      release()
    }
    const check = window.setTimeout(() => {
      const context = contextRef.current
      const audio = audioRef.current
      if (audio && !audio.paused && (!context || context.state === 'running')) release()
    }, 800)
    events.forEach((name) => window.addEventListener(name, unlock, true))
    return () => {
      window.clearTimeout(check)
      release()
    }
  }, [])

  const loopRef = useRef(loop)
  loopRef.current = loop

  const loaded = current >= 0
  const next = () => {
    if (!playable.length) return
    const at = playable.indexOf(current)
    load(playable[(at + 1) % playable.length])
  }
  const back = () => {
    const audio = audioRef.current
    if (!loaded || !audio) return
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const at = playable.indexOf(current)
    load(playable[(at - 1 + playable.length) % playable.length])
  }
  const toggle = () => {
    const audio = audioRef.current
    if (!loaded || !audio) return
    if (audio.paused) {
      if (contextRef.current && contextRef.current.state === 'suspended') contextRef.current.resume()
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }
  const stop = () => {
    const audio = audioRef.current
    if (!loaded || !audio) return
    audio.pause()
    audio.currentTime = 0
  }

  const icon = (kind) =>
    createElement(
      'svg',
      { viewBox: '0 0 40 24', className: 'player-icon', 'aria-hidden': 'true' },
      kind === 'back' && createElement('path', { d: 'M20 4v16L8 12zM32 4v16L20 12z' }),
      kind === 'next' && createElement('path', { d: 'M8 4v16l12-8zM20 4v16l12-8z' }),
      kind === 'play' && createElement('path', { d: 'M13 3v18l16-9z' }),
      kind === 'pause' && createElement('path', { d: 'M12 3h6v18h-6zM22 3h6v18h-6z' }),
      kind === 'stop' && createElement('rect', { x: 11, y: 5, width: 18, height: 14 }),
      kind === 'loop' && createElement('ellipse', { cx: 20, cy: 12, rx: 11, ry: 8 })
    )

  const button = (key, label, onClick, enabled, kind, pressed) =>
    createElement(
      'button',
      {
        key,
        type: 'button',
        className: `player-button${enabled ? ' is-on' : ''}${pressed ? ' is-pressed' : ''}`,
        'aria-label': label,
        'aria-pressed': pressed === undefined ? undefined : pressed,
        disabled: !enabled,
        onClick,
      },
      icon(kind)
    )

  return createElement(
    'div',
    { className: 'player', onBlur: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) } },
    createElement('span', { className: 'player-label player-label--artist' }, 'Artist:'),
    createElement('output', { className: 'player-field player-field--artist' }, loaded ? ARTIST : ''),
    createElement('span', { className: 'player-label player-label--track' }, 'Track:'),
    createElement('output', { className: 'player-field player-field--track' }, loaded ? TRACKS[current].title : ''),
    createElement(
      'button',
      {
        type: 'button',
        className: 'player-drop',
        'aria-haspopup': 'listbox',
        'aria-expanded': open,
        'aria-label': '수록곡 열기',
        onClick: () => setOpen((value) => !value),
        onKeyDown: (event) => {
          if (event.key === 'Escape') setOpen(false)
        },
      },
      createElement('i')
    ),
    open
      ? createElement(
          'ul',
          { className: 'player-menu', role: 'listbox', 'aria-label': '수록곡' },
          TRACKS.map((track, index) =>
            createElement(
              'li',
              { key: track.id, role: 'option', 'aria-selected': index === current, 'aria-disabled': !track.src },
              createElement(
                'button',
                {
                  type: 'button',
                  disabled: !track.src,
                  onClick: () => {
                    load(index)
                    setOpen(false)
                  },
                },
                createElement('span', { className: 'player-menu__no' }, String(index + 1).padStart(2, '0')),
                track.title,
                track.src ? null : createElement('em', null, ' — 준비 중')
              )
            )
          )
        )
      : null,
    createElement(
      'div',
      { className: 'player-buttons' },
      button('back', '이전 곡', back, loaded, 'back'),
      button('next', '다음 곡', next, playable.length > 0, 'next'),
      button('play', playing ? '일시정지' : '재생', toggle, loaded, playing ? 'pause' : 'play'),
      button('stop', '정지', stop, loaded, 'stop'),
      button('loop', '한 곡 반복', () => setLoop((value) => !value), loaded, 'loop', loop)
    )
  )
}
