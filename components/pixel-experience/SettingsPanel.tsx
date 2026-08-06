'use client'

import type { CSSProperties } from 'react'
import { MOSAIC_SHAPE_PRESETS } from '../../lib/mosaic-settings.mjs'

export type MosaicSettings = {
  scale: number
  spacing: number
  outputWidth: number
  characterSet: string
  shape: 'moe' | 'circle' | 'square'
  brightness: number
  contrast: number
  saturation: number
  hue: number
  sharpness: number
  gamma: number
  colorMode: 'original' | 'mono'
  background: string
  intensity: number
}

type SettingsPanelProps = {
  settings: MosaicSettings
  onChange: (patch: Partial<MosaicSettings>) => void
}

type CompactRangeControlProps = {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue?: string
  onChange: (value: number) => void
}

function CompactRangeControl({
  id,
  label,
  value,
  min,
  max,
  step,
  displayValue = String(value),
  onChange,
}: CompactRangeControlProps) {
  const fill = ((value - min) / (max - min)) * 100

  return (
    <div
      className="compact-setting-row"
      style={{ '--setting-fill': `${fill}%` } as CSSProperties}
    >
      <span className="compact-setting-fill" aria-hidden="true" />
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output htmlFor={id}>{displayValue}</output>
    </div>
  )
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <p className="panel-label pattern-label">pattern</p>

      <label className="compact-select-row" htmlFor="setting-shape">
        <span>shape</span>
        <select
          id="setting-shape"
          value={settings.shape}
          onChange={(event) => onChange({
            shape: event.target.value === 'circle'
              ? 'circle'
              : event.target.value === 'square'
                ? 'square'
                : 'moe',
          })}
        >
          {MOSAIC_SHAPE_PRESETS.map((preset) => (
            <option value={preset.id} key={preset.id}>{preset.label}</option>
          ))}
        </select>
      </label>

      <CompactRangeControl
        id="setting-scale"
        label="scale"
        value={settings.scale}
        min={1}
        max={20}
        step={1}
        onChange={(scale) => onChange({ scale })}
      />

      <CompactRangeControl
        id="setting-spacing"
        label="spacing"
        value={settings.spacing}
        min={0}
        max={1}
        step={0.05}
        displayValue={settings.spacing.toFixed(2)}
        onChange={(spacing) => onChange({ spacing })}
      />
    </div>
  )
}
