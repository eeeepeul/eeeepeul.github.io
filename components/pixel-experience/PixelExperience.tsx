'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { brandMarkSvg } from '../../lib/brand-mark.mjs'
import { effectiveTiles, manualTilesFromPosition } from '../../lib/pixel-controls.mjs'
import {
  DEFAULT_PIXEL_PALETTE_ID,
  getPixelPalettePreset,
} from '../../lib/pixel-palette.mjs'
import {
  DEFAULT_MOSAIC_SETTINGS,
  getCharacterSetPreset,
  normalizeMosaicSettings,
  resolveMosaicColumns,
} from '../../lib/mosaic-settings.mjs'
import { MOSAIC_VIDEO_FILES, pickNextVideoIndex } from '../../lib/video-playlist.mjs'
import { useH264Recorder } from '../../hooks/useH264Recorder'
import { usePlaybackEngine } from '../../hooks/usePlaybackEngine'
import { ColorPanel } from './ColorPanel'
import { DragControl } from './DragControl'
import { ExperienceFrame } from './ExperienceFrame.mjs'
import { ExportButton } from './ExportButton'
import { PixelCanvas } from './PixelCanvas'
import type { MosaicSettings } from './SettingsPanel'

function formatTime(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const minutes = Math.floor(safeValue / 60)
  const seconds = Math.floor(safeValue % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function PixelExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [manualPosition, setManualPosition] = useState(0.18)
  const [paletteId, setPaletteId] = useState(DEFAULT_PIXEL_PALETTE_ID)
  const [settings, setSettings] = useState<MosaicSettings>(() => ({ ...DEFAULT_MOSAIC_SETTINGS }))
  const [videoIndex, setVideoIndex] = useState(0)
  const [webglError, setWebglError] = useState<string | null>(null)
  const playback = usePlaybackEngine()
  const recorder = useH264Recorder()
  const baseTiles = useMemo(() => manualTilesFromPosition(manualPosition), [manualPosition])
  const settingsTiles = useMemo(
    () => resolveMosaicColumns(baseTiles, settings),
    [baseTiles, settings]
  )
  const tiles = useMemo(
    () => effectiveTiles(settingsTiles, playback.glitch),
    [settingsTiles, playback.glitch]
  )
  const palette = useMemo(
    () => ({ ...getPixelPalettePreset(paletteId), background: settings.background }),
    [paletteId, settings.background]
  )
  const characterSet = useMemo(
    () => getCharacterSetPreset(settings.characterSet),
    [settings.characterSet]
  )
  const hasStarted = playback.status === 'playing' || playback.status === 'ended'
  const isReady = playback.status === 'ready' || hasStarted

  const handleWebglError = useCallback((message: string) => setWebglError(message), [])
  const handleSettingsChange = useCallback((patch: Partial<MosaicSettings>) => {
    setSettings((current) => (
      normalizeMosaicSettings({ ...current, ...patch }) as MosaicSettings
    ))
  }, [])
  const playRandomNextVideo = useCallback(() => {
    setVideoIndex((current) => pickNextVideoIndex(current, MOSAIC_VIDEO_FILES.length))
  }, [])
  const handleExport = useCallback(async () => {
    const started = await recorder.startRecording(canvasRef.current, playback.recordingAudioStream)
    if (started) await playback.restart()
  }, [playback, recorder])

  useEffect(() => {
    if (playback.status === 'ended' && recorder.recording) recorder.stopRecording()
  }, [playback.status, recorder])

  useEffect(() => {
    setVideoIndex(pickNextVideoIndex(-1, MOSAIC_VIDEO_FILES.length))
  }, [])

  useEffect(() => {
    const video = playback.videoRef.current
    if (!video || playback.status === 'ended') return
    video.load()
    void video.play().catch(() => {})
  }, [videoIndex, playback.videoRef])

  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0
  const activeError = webglError || playback.error || recorder.error

  return (
    <ExperienceFrame
      homeHref={assetPath('')}
      mark={(
        <div
          className="brand-mark"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: brandMarkSvg() }}
        />
      )}
      panel={(
        <ColorPanel
          selectedId={paletteId}
          onSelect={setPaletteId}
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
      )}
    >
      <div className="stage-workspace">
        <section className="visual-stage" aria-label="픽셀 CCTV 재생 영역">
          <PixelCanvas
            video={playback.videoRef.current}
            tiles={tiles}
            glitch={playback.glitch}
            palette={palette}
            settings={settings}
            characterSet={characterSet}
            playing={true}
            recording={recorder.recording}
            canvasRef={canvasRef}
            onError={handleWebglError}
          />

          <video
            ref={playback.videoRef}
            className="source-media"
            src={assetPath(MOSAIC_VIDEO_FILES[videoIndex])}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={playRandomNextVideo}
            aria-hidden="true"
          />
          <audio
            ref={playback.audioRef}
            className="source-media"
            src={assetPath('media/if-and-only-if.mp3')}
            preload="auto"
          />
        </section>

        <section className="control-deck" aria-label="픽셀 컨트롤">
          <div className="timeline-row">
            <span className="timecode">{formatTime(playback.currentTime)}</span>
            <div className="timeline" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} />
            </div>
            <span className="timecode">{formatTime(playback.duration)}</span>
          </div>

          <DragControl
            value={manualPosition}
            tiles={tiles}
            onChange={setManualPosition}
            disabled={!isReady && playback.status === 'loading'}
          />

          <div className="action-row">
            <div className="kick-monitor">
              <span>KICK INPUT</span>
              <i aria-hidden="true"><b style={{ transform: `scaleX(${playback.kick})` }} /></i>
            </div>
            <div className="button-group">
              <button
                className="action-button"
                type="button"
                onClick={() => void (hasStarted ? playback.restart() : playback.start())}
                disabled={playback.status === 'loading' || recorder.recording}
              >
                {playback.status === 'loading' ? '시작 중' : hasStarted ? '처음부터' : '음악 시작'}
              </button>
              <ExportButton
                supported={recorder.supported}
                recording={recorder.recording}
                disabled={!hasStarted || !playback.recordingAudioStream}
                onStart={() => void handleExport()}
                onStop={recorder.stopRecording}
              />
            </div>
          </div>

          {!recorder.supported && (
            <p className="support-note">
              H.264 MP4 저장은 지원 브라우저에서만 활성화됩니다. 화면 조작과 자동 Kick 반응은 그대로 사용할 수 있습니다.
            </p>
          )}
          {activeError && <p className="error-note" role="alert">{activeError}</p>}
        </section>
      </div>
    </ExperienceFrame>
  )
}
