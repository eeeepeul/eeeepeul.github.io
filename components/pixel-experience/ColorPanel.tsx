'use client'

import type { CSSProperties } from 'react'
import { DEFAULT_PIXEL_PALETTE } from '../../lib/pixel-palette.mjs'

type PixelPalette = typeof DEFAULT_PIXEL_PALETTE
type PaletteKey = keyof PixelPalette

type ColorPanelProps = {
  palette: PixelPalette
  onChange: (key: PaletteKey, value: string) => void
}

const COLOR_FIELDS: Array<{ key: PaletteKey; label: string }> = [
  { key: 'background', label: '배경' },
  { key: 'diagonal', label: '사선' },
  { key: 'circle', label: '동그라미' },
  { key: 'solid', label: '네모' },
]

export function ColorPanel({ palette, onChange }: ColorPanelProps) {
  return (
    <aside className="color-panel" aria-label="색상 변경">
      <p className="panel-label">COLOURS &amp; PATTERNS</p>
      <div className="palette-grid">
        {COLOR_FIELDS.map(({ key, label }) => (
          <label className="palette-control" key={key}>
            <span
              className={`palette-preview palette-preview--${key}`}
              style={{ '--swatch-color': palette[key] } as CSSProperties}
            >
              <input
                type="color"
                value={palette[key]}
                aria-label={`${label} 색상`}
                onChange={(event) => onChange(key, event.currentTarget.value)}
              />
            </span>
            <span className="palette-name">{label}</span>
            <output>{palette[key]}</output>
          </label>
        ))}
      </div>
    </aside>
  )
}
