'use client'

import type { CSSProperties } from 'react'
import { PIXEL_PALETTE_PRESETS } from '../../lib/pixel-palette.mjs'
import { SettingsPanel, type MosaicSettings } from './SettingsPanel'

type PalettePresetId = (typeof PIXEL_PALETTE_PRESETS)[number]['id']

type ColorPanelProps = {
  selectedId: PalettePresetId
  onSelect: (id: PalettePresetId) => void
  settings: MosaicSettings
  onSettingsChange: (patch: Partial<MosaicSettings>) => void
}

export function ColorPanel({
  selectedId,
  onSelect,
  settings,
  onSettingsChange,
}: ColorPanelProps) {
  return (
    <div className="color-panel-content">
      <p className="panel-label">color combination</p>
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
                '--preset-main': preset.palette.circle,
              } as CSSProperties}
            >
              <i className="palette-main-swatch" />
            </span>
            <span className="palette-preset-name">SKY BLUE</span>
          </button>
        ))}
      </div>
      <SettingsPanel
        settings={settings}
        onChange={onSettingsChange}
      />
    </div>
  )
}
