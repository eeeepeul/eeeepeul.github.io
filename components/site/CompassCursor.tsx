'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { getCompassDirection } from '../../lib/compass-cursor.mjs'

type Point = { x: number; y: number }
type CompassDirection = 'up' | 'down' | 'left' | 'right'

const CURSOR_IMAGES: Record<CompassDirection, string> = {
  up: assetPath('static/images/epeul/cursor-mark-up.svg'),
  down: assetPath('static/images/epeul/cursor-mark-down.svg'),
  left: assetPath('static/images/epeul/cursor-mark-left.svg'),
  right: assetPath('static/images/epeul/cursor-mark-right.svg'),
}

export function CompassCursor() {
  const [position, setPosition] = useState<Point>({ x: -100, y: -100 })
  const previousPositionRef = useRef<Point | null>(null)
  const [direction, setDirection] = useState<CompassDirection>('up')

  useEffect(() => {
    document.body.classList.add('compass-cursor-active')

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return

      const nextPosition = { x: event.clientX, y: event.clientY }
      const previousPosition = previousPositionRef.current
      if (previousPosition) setDirection(getCompassDirection(previousPosition, nextPosition))
      previousPositionRef.current = nextPosition
      setPosition(nextPosition)
    }
    const handlePointerLeave = () => {
      previousPositionRef.current = null
      setPosition({ x: -100, y: -100 })
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) handlePointerLeave()
    }
    window.addEventListener('pointerout', handlePointerOut)

    return () => {
      document.body.classList.remove('compass-cursor-active')
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerout', handlePointerOut)
    }
  }, [])

  return (
    <div
      className={`compass-cursor-mark compass-cursor-${direction}`}
      aria-hidden="true"
      style={{
        transform: `translate3d(${position.x - 44}px, ${position.y - 44}px, 0)`,
        '--compass-cursor-image': `url(${CURSOR_IMAGES[direction]})`,
      } as CSSProperties}
    >
      <span className="compass-cursor-compass" />
    </div>
  )
}
