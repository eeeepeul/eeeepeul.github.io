'use client'

import { createElement, useEffect, useState } from 'react'
import {
  ROOM_ZOOM_MAX,
  ROOM_ZOOM_MIN,
  ROOM_ZOOM_STEP,
  getRoomZoom,
  setRoomZoom,
  subscribeRoomZoom,
} from '../../lib/room-zoom.mjs'

// Box 7 of the second pages, the status bar along the bottom, as in a map program: at the left where the view is
// (how near the room is shown, the cell of the map at the middle of the view, whether the camera follows a match
// or looks over the room, and how many matches are in it), at the right the two keys that make the view further off
// and nearer. The keys change lib/room-zoom.mjs, which the camera of the room follows.
const READ_MS = 120

export function StageRoomStatus() {
  const [zoom, setZoom] = useState(getRoomZoom())
  const [view, setView] = useState({ x: null, y: null, mode: 'living-room', matches: 0 })

  useEffect(() => subscribeRoomZoom(setZoom), [])

  useEffect(() => {
    const read = () => {
      const world = document.querySelector('.house-interior-camera-world')
      if (!world) return
      const x = Number(world.dataset.viewX)
      const y = Number(world.dataset.viewY)
      const next = {
        x: Number.isFinite(x) ? Math.round(x) : null,
        y: Number.isFinite(y) ? Math.round(y) : null,
        mode: world.dataset.cameraMode === 'following' ? 'following' : 'living-room',
        matches: world.querySelectorAll('.wandering-character-entity').length,
      }
      setView((current) =>
        current.x === next.x && current.y === next.y && current.mode === next.mode && current.matches === next.matches
          ? current
          : next
      )
    }
    read()
    const timer = window.setInterval(read, READ_MS)
    return () => window.clearInterval(timer)
  }, [])

  const field = (className, text, label) =>
    createElement('output', { key: className, className: `stage-room-status__field ${className}`, title: label }, text)
  const atMin = zoom <= ROOM_ZOOM_MIN + 0.001
  const atMax = zoom >= ROOM_ZOOM_MAX - 0.001

  return createElement(
    'div',
    { className: 'stage-room-status', role: 'group', 'aria-label': '화면 상태' },
    field('stage-room-status__field--zoom', `${Math.round(zoom * 100)}%`, '확대 정도'),
    field('stage-room-status__field--place', view.x === null ? 'X: --  Y: --' : `X: ${view.x}  Y: ${view.y}`, '보고 있는 위치(칸)'),
    field('stage-room-status__field--mode', view.mode === 'following' ? 'FOLLOW' : 'ROOM', '카메라'),
    field('stage-room-status__field--matches', `M: ${view.matches}`, '방 안의 성냥 수'),
    createElement(
      'div',
      { className: 'stage-room-status__keys' },
      createElement(
        'button',
        {
          type: 'button',
          className: 'stage-room-status__key',
          'aria-label': '화면 축소',
          disabled: atMin,
          onClick: () => setRoomZoom(getRoomZoom() / ROOM_ZOOM_STEP),
        },
        '−'
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: 'stage-room-status__key',
          'aria-label': '화면 확대',
          disabled: atMax,
          onClick: () => setRoomZoom(getRoomZoom() * ROOM_ZOOM_STEP),
        },
        '+'
      )
    )
  )
}
