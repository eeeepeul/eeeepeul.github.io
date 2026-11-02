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

    const moveTo = (x: number, y: number) => {
      const nextPosition = { x, y }
      const previousPosition = previousPositionRef.current
      if (previousPosition) setDirection(getCompassDirection(previousPosition, nextPosition))
      previousPositionRef.current = nextPosition
      setPosition(nextPosition)
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      moveTo(event.clientX, event.clientY)
    }

    // The pages of their own (the iframes of the stage) take the pointer away from the window, so the
    // mark would stay where it was and the arrow of the system would show. Each page tells the mark where
    // the pointer is (its place in the page plus the page's place in the window), and hides the arrow.
    const watched = new WeakSet<HTMLIFrameElement>()
    const watch = (frame: HTMLIFrameElement) => {
      const attach = () => {
        const frameWindow = frame.contentWindow
        const frameDocument = frame.contentDocument
        if (!frameWindow || !frameDocument || !frameDocument.documentElement) return
        const hide = frameDocument.createElement('style')
        hide.textContent = 'html, html * { cursor: none !important; }'
        frameDocument.head?.appendChild(hide)
        // a 3D viewer keeps its own arrow inside its shadow
        frameDocument.querySelectorAll('model-viewer').forEach((viewer) => {
          const shadow = (viewer as HTMLElement).shadowRoot
          if (!shadow) return
          const inner = frameDocument.createElement('style')
          inner.textContent = '* { cursor: none !important; }'
          shadow.appendChild(inner)
        })
        frameWindow.addEventListener(
          'pointermove',
          (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== 'mouse') return
            const box = frame.getBoundingClientRect()
            const scale = frame.offsetWidth ? box.width / frame.offsetWidth : 1
            moveTo(box.left + event.clientX * scale, box.top + event.clientY * scale)
          },
          { passive: true }
        )
      }
      if (watched.has(frame)) return
      watched.add(frame)
      frame.addEventListener('load', attach)
      if (frame.contentDocument && frame.contentDocument.readyState === 'complete') attach()
    }
    const scan = () => document.querySelectorAll<HTMLIFrameElement>('iframe').forEach(watch)
    scan()
    const watcher = new MutationObserver(scan)
    watcher.observe(document.body, { childList: true, subtree: true })
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
      watcher.disconnect()
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
