'use client'

import type { CSSProperties } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { PIXEL_PALETTE_PRESETS } from '../../lib/pixel-palette.mjs'
import { SettingsPanel, type MosaicSettings } from './SettingsPanel'

type PalettePresetId = (typeof PIXEL_PALETTE_PRESETS)[number]['id']

function formatTime(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const minutes = Math.floor(safeValue / 60)
  const seconds = Math.floor(safeValue % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

type ColorPanelProps = {
  selectedId: PalettePresetId
  onSelect: (id: PalettePresetId) => void
  settings: MosaicSettings
  onSettingsChange: (patch: Partial<MosaicSettings>) => void
  selectedHouseId?: string
  houseLabel?: string
  houseTitle?: string
  currentTime?: number
  duration?: number
  isPlaying?: boolean
  onSeek?: (time: number) => void
  onPrevious?: () => void
  onTogglePlayback?: () => void
  onNext?: () => void
}

export function ColorPanel({
  selectedId,
  onSelect,
  settings,
  onSettingsChange,
  selectedHouseId = 'house1',
  houseLabel = 'house 1',
  houseTitle = 'House 1 CCTV',
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  onSeek,
  onPrevious,
  onTogglePlayback,
  onNext,
}: ColorPanelProps) {
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  const paletteLetters = ['M', 'O', 'M', 'E']
  const technicalDrawingAssets = [
    { houseId: 'house1', label: 'spot 01', union: '1', src: 'media/figma-technical-drawing-o.svg' },
    { houseId: 'house2', label: 'spot 02', union: '2', src: 'media/figma-technical-drawing-m1.svg' },
    { houseId: 'house3', label: 'spot 03', union: '3', src: 'media/figma-technical-drawing-m2.svg' },
    { houseId: 'house4', label: 'spot 04', union: '4', src: 'media/figma-technical-drawing-e.svg' },
  ]
  const activeTechnicalDrawing =
    technicalDrawingAssets.find((drawing) => drawing.houseId === selectedHouseId) ?? technicalDrawingAssets[0]
  const spotRows = [
    { houseId: 'house1', label: 'spot 01', active: selectedHouseId === 'house1' },
    { houseId: 'house2', label: 'spot 02', active: selectedHouseId === 'house2' },
    { houseId: 'house3', label: 'spot 03', active: selectedHouseId === 'house3' },
    { houseId: 'house4', label: 'spot 04', active: selectedHouseId === 'house4' },
  ]

  return (
    <div className="color-panel-content cctv-sidebar-content">
      <section className="cctv-sidebar-section now-playing-section" aria-label="현재 재생 중인 CCTV">
        <div className="now-playing-card">
          <p className="panel-label">now playing</p>
          <div className="now-playing-main">
            <div className="now-playing-artwork" aria-label="앨범 아트" role="img">
              <img
                className="now-playing-artwork-shadow"
                src={assetPath('media/figma-cctv-artwork.svg')}
                alt=""
                aria-hidden="true"
              />
              <img
                className="now-playing-artwork-face"
                src={assetPath('media/figma-cctv-artwork-shadow.svg')}
                alt=""
                aria-hidden="true"
              />
            </div>
            <div className="now-playing-copy">
              <strong>If and only if</strong>
              <span>Deep House &amp; UK Garage</span>
              <small>(2026)</small>
            </div>
          </div>
          <div className="now-playing-progress">
            <span>{formatTime(currentTime)}</span>
            <input
              className="now-playing-progress-track"
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={Math.min(duration, Math.max(0, currentTime))}
              aria-label="재생 위치"
              disabled={!onSeek || duration <= 0}
              onChange={(event) => onSeek?.(Number(event.target.value))}
              style={{ '--progress': `${progress * 100}%` } as CSSProperties}
            />
            <span>{formatTime(duration)}</span>
          </div>
          <div className="now-playing-controls" aria-label="재생 컨트롤">
            <button type="button" aria-label="이전 트랙" onClick={onPrevious} />
            <button
              type="button"
              className={isPlaying ? 'is-active is-playing' : 'is-active'}
              aria-label={isPlaying ? '일시정지' : '재생'}
              onClick={onTogglePlayback}
            />
            <button type="button" aria-label="다음 트랙" onClick={onNext} />
          </div>
        </div>
      </section>

      <section className="cctv-sidebar-section house-layout-section playing-at-section" aria-label={`${houseLabel} 재생 위치`}>
        <p className="panel-label">playing at</p>
        <div className="playing-at-content">
          <div className="playing-at-spots">
            {spotRows.map((spot) => (
              <a
                className={`playing-at-row${spot.active ? ' is-active' : ''}`}
                key={spot.houseId}
                href={`${assetPath('experience')}/?house=${spot.houseId}`}
                aria-current={spot.active ? 'page' : undefined}
              >
                <span className={`playing-at-dot${spot.active ? ' is-active' : ''}`} aria-hidden="true" />
                <span className="playing-at-label">{spot.label}</span>
                <span className="playing-at-bars" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, index) => (
                    <i className={spot.active && index < 6 ? 'is-active' : ''} key={index} />
                  ))}
                </span>
              </a>
            ))}
          </div>
          <div
            className="playing-at-technical-drawing"
            aria-label={`Technical Drawing ${activeTechnicalDrawing.union} union`}
          >
            <div className="playing-at-technical-drawing-item">
              <img src={assetPath(activeTechnicalDrawing.src)} alt={`${activeTechnicalDrawing.union} union`} />
            </div>
          </div>
        </div>
      </section>

      <section className="cctv-sidebar-section palette-section" aria-label="영상 색 조합">
        <p className="panel-label">color combination</p>
        <div className="palette-presets">
          {PIXEL_PALETTE_PRESETS.map((preset, index) => (
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
                <b className="palette-letter">{paletteLetters[index]}</b>
              </span>
              <span className="palette-preset-name">SKY BLUE</span>
            </button>
          ))}
        </div>
      </section>

      <section className="cctv-sidebar-section mosaic-section" aria-label="모자이크 패턴 설정">
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
        />
      </section>
    </div>
  )
}
