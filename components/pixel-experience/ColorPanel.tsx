'use client'

import type { CSSProperties } from 'react'
import { PIXEL_PALETTE_PRESETS } from '../../lib/pixel-palette.mjs'

type PalettePresetId = (typeof PIXEL_PALETTE_PRESETS)[number]['id']

type ColorPanelProps = {
  selectedId: PalettePresetId
  onSelect: (id: PalettePresetId) => void
}

export function ColorPanel({ selectedId, onSelect }: ColorPanelProps) {
  return (
    <aside className="color-panel" aria-label="색 조합 변경">
      <p className="panel-label">COLOR COMBINATIONS</p>
      <div className="palette-presets">
        {PIXEL_PALETTE_PRESETS.map((preset) => (
          <button
            className="palette-preset"
            type="button"
            key={preset.id}
            aria-label={`${preset.label} 색 조합`}
            aria-pressed={selectedId === preset.id}
            title={preset.label}
            onClick={() => onSelect(preset.id)}
          >
            <span
              className="palette-preset-preview"
              aria-hidden="true"
              style={{
                '--preset-background': preset.palette.background,
                '--preset-diagonal': preset.palette.diagonal,
                '--preset-circle': preset.palette.circle,
                '--preset-solid': preset.palette.solid,
              } as CSSProperties}
            >
              <i className="preset-letter preset-letter--e">E</i>
              <i className="preset-letter preset-letter--o">O</i>
              <i className="preset-letter preset-letter--m">M</i>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
