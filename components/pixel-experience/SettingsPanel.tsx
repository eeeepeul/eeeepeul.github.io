'use client'

import { useEffect, useState } from 'react'
import {
  CHARACTER_SET_PRESETS,
  DEFAULT_MOSAIC_SETTINGS,
} from '../../lib/mosaic-settings.mjs'

export type MosaicSettings = {
  scale: number
  spacing: number
  outputWidth: number
  characterSet: string
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
  onReset: () => void
}

type RangeControlProps = {
  id: string
  label: string
  value: number
  defaultValue: number
  min: number
  max: number
  step: number
  displayValue?: string
  onChange: (value: number) => void
}

function RangeControl({
  id,
  label,
  value,
  defaultValue,
  min,
  max,
  step,
  displayValue = String(value),
  onChange,
}: RangeControlProps) {
  return (
    <div className="setting-control">
      <div className="setting-meta">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{displayValue}</output>
      </div>
      <div className="setting-input-line">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <button
          className="setting-reset"
          type="button"
          aria-label={`${label} 초기화`}
          title={`${label} 초기화`}
          disabled={value === defaultValue}
          onClick={() => onChange(defaultValue)}
        >
          ↺
        </button>
      </div>
    </div>
  )
}

export function SettingsPanel({ settings, onChange, onReset }: SettingsPanelProps) {
  const [backgroundDraft, setBackgroundDraft] = useState(settings.background)

  useEffect(() => setBackgroundDraft(settings.background), [settings.background])

  const commitBackground = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(backgroundDraft)) {
      onChange({ background: backgroundDraft.toUpperCase() })
    } else {
      setBackgroundDraft(settings.background)
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-heading">
        <h2>SETTINGS</h2>
        <button type="button" onClick={onReset}>RESET</button>
      </div>

      <section className="settings-section" aria-labelledby="ascii-settings">
        <h3 id="ascii-settings">ASCII</h3>
        <RangeControl
          id="setting-scale"
          label="Scale"
          value={settings.scale}
          defaultValue={DEFAULT_MOSAIC_SETTINGS.scale}
          min={1}
          max={20}
          step={1}
          onChange={(scale) => onChange({ scale })}
        />
        <RangeControl
          id="setting-spacing"
          label="Spacing"
          value={settings.spacing}
          defaultValue={DEFAULT_MOSAIC_SETTINGS.spacing}
          min={0}
          max={1}
          step={0.05}
          displayValue={settings.spacing.toFixed(2)}
          onChange={(spacing) => onChange({ spacing })}
        />
        <RangeControl
          id="setting-output-width"
          label="Output Width"
          value={settings.outputWidth}
          defaultValue={DEFAULT_MOSAIC_SETTINGS.outputWidth}
          min={0}
          max={500}
          step={10}
          onChange={(outputWidth) => onChange({ outputWidth })}
        />
        <label className="setting-select" htmlFor="setting-character-set">
          <span>Character Set</span>
          <select
            id="setting-character-set"
            value={settings.characterSet}
            onChange={(event) => onChange({ characterSet: event.target.value })}
          >
            {CHARACTER_SET_PRESETS.map((preset) => (
              <option value={preset.id} key={preset.id}>{preset.label}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="settings-section" aria-labelledby="adjustment-settings">
        <h3 id="adjustment-settings">ADJUSTMENTS</h3>
        <RangeControl id="setting-brightness" label="Brightness" value={settings.brightness} defaultValue={0} min={-100} max={100} step={1} onChange={(brightness) => onChange({ brightness })} />
        <RangeControl id="setting-contrast" label="Contrast" value={settings.contrast} defaultValue={0} min={-100} max={100} step={1} onChange={(contrast) => onChange({ contrast })} />
        <RangeControl id="setting-saturation" label="Saturation" value={settings.saturation} defaultValue={0} min={-100} max={100} step={1} onChange={(saturation) => onChange({ saturation })} />
        <RangeControl id="setting-hue" label="Hue Rotation" value={settings.hue} defaultValue={0} min={0} max={360} step={1} displayValue={`${settings.hue}°`} onChange={(hue) => onChange({ hue })} />
        <RangeControl id="setting-sharpness" label="Sharpness" value={settings.sharpness} defaultValue={0} min={0} max={100} step={1} onChange={(sharpness) => onChange({ sharpness })} />
        <RangeControl id="setting-gamma" label="Gamma" value={settings.gamma} defaultValue={1} min={0.1} max={3} step={0.1} displayValue={settings.gamma.toFixed(1)} onChange={(gamma) => onChange({ gamma })} />
      </section>

      <section className="settings-section" aria-labelledby="color-settings">
        <h3 id="color-settings">COLOR</h3>
        <label className="setting-select" htmlFor="setting-color-mode">
          <span>Mode</span>
          <select
            id="setting-color-mode"
            value={settings.colorMode}
            onChange={(event) => onChange({
              colorMode: event.target.value === 'mono' ? 'mono' : 'original',
            })}
          >
            <option value="original">Original</option>
            <option value="mono">Mono</option>
          </select>
        </label>
        <div className="background-control">
          <label htmlFor="setting-background-text">Background</label>
          <div>
            <input
              aria-label="배경 색상 선택"
              type="color"
              value={settings.background}
              onChange={(event) => onChange({ background: event.target.value })}
            />
            <input
              id="setting-background-text"
              type="text"
              value={backgroundDraft}
              maxLength={7}
              spellCheck={false}
              onChange={(event) => setBackgroundDraft(event.target.value)}
              onBlur={commitBackground}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
          </div>
        </div>
        <RangeControl id="setting-intensity" label="Intensity" value={settings.intensity} defaultValue={1} min={0} max={2} step={0.1} displayValue={settings.intensity.toFixed(1)} onChange={(intensity) => onChange({ intensity })} />
      </section>
    </div>
  )
}
