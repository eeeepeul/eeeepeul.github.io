'use client'

import { useCallback, useRef } from 'react'
import { pointerPosition } from '../../lib/pixel-controls.mjs'

type DragControlProps = {
  value: number
  tiles: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function DragControl({ value, tiles, onChange, disabled = false }: DragControlProps) {
  const railRef = useRef<HTMLDivElement>(null)

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const bounds = railRef.current?.getBoundingClientRect()
      if (bounds) onChange(pointerPosition(clientX, bounds.left, bounds.width))
    },
    [onChange]
  )

  return (
    <div className="drag-control">
      <div className="drag-copy">
        <span>PIXEL SIZE</span>
        <output>{tiles} TILES / ROW</output>
      </div>
      <div
        ref={railRef}
        className="drag-rail"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="픽셀 크기"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`가로 ${tiles}개 타일`}
        aria-disabled={disabled}
        onPointerDown={(event) => {
          if (disabled) return
          event.currentTarget.setPointerCapture(event.pointerId)
          updateFromPointer(event.clientX)
        }}
        onPointerMove={(event) => {
          if (!disabled && event.currentTarget.hasPointerCapture(event.pointerId)) {
            updateFromPointer(event.clientX)
          }
        }}
        onKeyDown={(event) => {
          if (disabled) return
          let next = value
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= 0.025
          else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += 0.025
          else if (event.key === 'Home') next = 0
          else if (event.key === 'End') next = 1
          else return
          event.preventDefault()
          onChange(Math.min(1, Math.max(0, next)))
        }}
      >
        <span className="rail-start">FINE</span>
        <span className="rail-end">BOLD</span>
        <span className="drag-fill" style={{ width: `${value * 100}%` }} />
        <span className="drag-handle" style={{ left: `${value * 100}%` }} aria-hidden="true">
          <span />
        </span>
      </div>
    </div>
  )
}
