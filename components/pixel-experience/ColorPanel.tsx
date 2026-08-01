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
  onResetSettings: () => void
}

export function ColorPanel({
  selectedId,
  onSelect,
  settings,
  onSettingsChange,
  onResetSettings,
}: ColorPanelProps) {
  return (
    <div className="color-panel-content">
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
                '--preset-glyph': preset.palette.glyph,
              } as CSSProperties}
            >
              <i className="preset-letter preset-letter--e">E</i>
              <i className="preset-letter preset-letter--o">O</i>
              <i className="preset-letter preset-letter--m">M</i>
            </span>
          </button>
        ))}
      </div>
      <SettingsPanel
        settings={settings}
        onChange={onSettingsChange}
        onReset={onResetSettings}
      />
    </div>
  )
}
