'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  advanceHouse,
  createHouseDistances,
  getHousePair,
  getHouseWindow,
  scrollHousePosition,
  settleHouseDrag,
} from '../../lib/house-distance.mjs'

const SIDEBAR_CARET_URL = assetPath('media/figma-sidebar-caret.svg')
const DISTANCE_TICKS_LEFT_URL = assetPath('media/figma-distance-ticks-left.svg')
const DISTANCE_TICKS_MIDDLE_URL = assetPath('media/figma-distance-ticks-middle.svg')
const DISTANCE_TICKS_RIGHT_URL = assetPath('media/figma-distance-ticks-right.svg')
const DISTANCE_SEGMENT_ONE_URL = assetPath('media/figma-distance-segment-one.svg')
const DISTANCE_SEGMENT_TWO_URL = assetPath('media/figma-distance-segment-two.svg')
export const DEFAULT_HOUSE_DISTANCES = [13_978, 11_420, 16_640, 9_180]
const TRACK_WIDTH = 261
const MAX_DRAG_OFFSET = TRACK_WIDTH
let generatedPageDistances = null

function clampDragOffset(value) {
  return Math.max(-MAX_DRAG_OFFSET, Math.min(MAX_DRAG_OFFSET, value))
}

export function HouseDistanceCard({ onStateChange }) {
  const [distances, setDistances] = useState(DEFAULT_HOUSE_DISTANCES)
  const [position, setPosition] = useState({ houseIndex: 0, offset: 0 })
  const [slideDirection, setSlideDirection] = useState(0)
  const [phase, setPhase] = useState('idle')
  const dragState = useRef({ pointerId: null, startX: 0, startOffset: 0 })
  const currentHouse = position.houseIndex
  const dragOffset = position.offset
  const pair = getHousePair(currentHouse)
  const distance = distances[currentHouse]
  const houseWindow = getHouseWindow(currentHouse)
  const slides = [
    { position: 'previous', index: houseWindow.previous },
    { position: 'current', index: houseWindow.current },
    { position: 'next', index: houseWindow.next },
  ]
  const houseBoundaries = [
    ...slides.map(({ index }) => getHousePair(index).from),
    getHousePair(slides.at(-1).index).to,
  ]
  const renderedOffset = phase === 'animating' ? -slideDirection * TRACK_WIDTH : dragOffset

  useEffect(() => {
    if (!generatedPageDistances) generatedPageDistances = createHouseDistances()
    setDistances(generatedPageDistances)
  }, [])

  useEffect(() => {
    onStateChange?.({ distances, houseIndex: currentHouse })
  }, [currentHouse, distances, onStateChange])

  const clearDragState = () => {
    dragState.current = { pointerId: null, startX: 0, startOffset: 0 }
  }

  const beginSlide = (direction, currentOffset = dragOffset) => {
    const normalizedDirection = Math.sign(direction)

    clearDragState()
    if (normalizedDirection === 0 && Math.abs(currentOffset) < 1) {
      setPosition((current) => ({ ...current, offset: 0 }))
      setSlideDirection(0)
      setPhase('idle')
      return
    }

    setSlideDirection(normalizedDirection)
    setPhase('animating')
  }

  const completeSlide = (event) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return

    setPosition((current) => ({
      houseIndex:
        slideDirection === 0
          ? current.houseIndex
          : advanceHouse(current.houseIndex, slideDirection),
      offset: 0,
    }))
    setSlideDirection(0)
    setPhase('idle')
  }

  const handlePointerDown = (event) => {
    if (phase !== 'idle') return
    if (event.button !== undefined && event.button !== 0) return
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: dragOffset,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setPhase('dragging')
  }

  const handlePointerMove = (event) => {
    if (dragState.current.pointerId !== event.pointerId) return
    setPosition((current) => ({
      ...current,
      offset: clampDragOffset(
        dragState.current.startOffset + event.clientX - dragState.current.startX
      ),
    }))
  }

  const handlePointerUp = (event) => {
    if (dragState.current.pointerId !== event.pointerId) return
    const finalOffset = clampDragOffset(
      dragState.current.startOffset + event.clientX - dragState.current.startX
    )
    const settled = settleHouseDrag(currentHouse, finalOffset, TRACK_WIDTH)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    clearDragState()
    setPosition(settled)
    setSlideDirection(0)
    setPhase('idle')
  }

  const handlePointerCancel = () => {
    clearDragState()
    setSlideDirection(0)
    setPhase('idle')
  }

  const handleWheel = (event) => {
    if (phase !== 'idle') return
    event.preventDefault()
    const deltaMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? TRACK_WIDTH : 1
    const deltaY = event.deltaY * deltaMultiplier

    setPosition((current) =>
      scrollHousePosition(current.houseIndex, current.offset, deltaY, TRACK_WIDTH)
    )
  }

  const handleKeyDown = (event) => {
    if (phase !== 'idle') return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      beginSlide(-1, 0)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      beginSlide(1, 0)
    }
  }

  const renderRouteSlide = ({ position, index }) => {
    const slideDistance = distances[index]

    return createElement(
      'div',
      {
        className: 'figma-distance-slide',
        'data-distance-slide': position,
        'aria-hidden': position === 'current' ? undefined : 'true',
        key: position,
      },
      createElement(
        'output',
        {
          className: 'figma-distance-value',
          'aria-live': position === 'current' ? 'polite' : undefined,
        },
        String(slideDistance)
      ),
      createElement(
        'div',
        { className: 'figma-distance-route', 'aria-hidden': 'true' },
        createElement('img', {
          className: 'figma-distance-ticks figma-distance-ticks--left',
          src: DISTANCE_TICKS_LEFT_URL,
          alt: '',
          draggable: false,
        }),
        createElement('img', {
          className: 'figma-distance-segment figma-distance-segment--one',
          src: DISTANCE_SEGMENT_ONE_URL,
          alt: '',
          draggable: false,
        }),
        createElement('img', {
          className: 'figma-distance-ticks figma-distance-ticks--middle',
          src: DISTANCE_TICKS_MIDDLE_URL,
          alt: '',
          draggable: false,
        }),
        createElement('img', {
          className: 'figma-distance-segment figma-distance-segment--two',
          src: DISTANCE_SEGMENT_TWO_URL,
          alt: '',
          draggable: false,
        }),
        createElement('img', {
          className: 'figma-distance-ticks figma-distance-ticks--right',
          src: DISTANCE_TICKS_RIGHT_URL,
          alt: '',
          draggable: false,
        })
      )
    )
  }

  return createElement(
    'section',
    { className: 'figma-sidebar-card figma-sidebar-distance', 'aria-label': '집 사이 거리' },
    createElement(
      'header',
      null,
      createElement('span', { className: 'figma-sidebar-chip' }, 'distance'),
      createElement(
        'div',
        { className: 'figma-distance-arrows' },
        createElement(
          'button',
          {
            type: 'button',
            className: 'figma-distance-arrow-button',
            'aria-label': '이전 집 거리 보기',
            disabled: phase !== 'idle',
            onClick: () => beginSlide(-1, 0),
          },
          createElement('img', {
            className: 'figma-distance-arrow figma-distance-arrow--previous',
            src: SIDEBAR_CARET_URL,
            alt: '',
            draggable: false,
          })
        ),
        createElement(
          'button',
          {
            type: 'button',
            className: 'figma-distance-arrow-button',
            'aria-label': '다음 집 거리 보기',
            disabled: phase !== 'idle',
            onClick: () => beginSlide(1, 0),
          },
          createElement('img', {
            className: 'figma-distance-arrow figma-distance-arrow--next',
            src: SIDEBAR_CARET_URL,
            alt: '',
            draggable: false,
          })
        )
      )
    ),
    createElement(
      'div',
      {
        className: `figma-distance-track is-${phase}`,
        role: 'slider',
        tabIndex: 0,
        'aria-label': '집 사이 거리 탐색',
        'aria-valuemin': 1,
        'aria-valuemax': 4,
        'aria-valuenow': currentHouse + 1,
        'aria-valuetext': `${pair.from}에서 ${pair.to}, 거리 ${distance}`,
        'data-house-from': pair.from,
        'data-house-to': pair.to,
        onKeyDown: handleKeyDown,
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerCancel,
        onWheel: handleWheel,
      },
      createElement(
        'div',
        {
          className: 'figma-distance-strip',
          style: { '--distance-drag': `${renderedOffset}px` },
          onTransitionEnd: completeSlide,
        },
        ...slides.map(renderRouteSlide),
        ...houseBoundaries.map((house, boundaryIndex) =>
          createElement(
            'span',
            {
              className: `figma-distance-house figma-distance-house-marker ${
                boundaryIndex < 2 ? 'is-leading' : 'is-trailing'
              }`,
              style: { '--house-boundary': boundaryIndex },
              key: `house-boundary-${boundaryIndex}`,
            },
            house
          )
        )
      )
    )
  )
}
