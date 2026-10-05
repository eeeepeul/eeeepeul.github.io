'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { brandMarkSvg } from '../../lib/brand-mark.mjs'
import {
  DEFAULT_PIXEL_PALETTE_ID,
  getPixelPalettePreset,
} from '../../lib/pixel-palette.mjs'
import { DEFAULT_MOSAIC_SETTINGS, normalizeMosaicSettings } from '../../lib/mosaic-settings.mjs'
import { MOSAIC_VIDEO_FILES, pickNextVideoIndex } from '../../lib/video-playlist.mjs'
import { getCctvHouse, normalizeHouseId } from '../../lib/cctv-houses.mjs'
import { waveformPathFromSamples } from '../../lib/waveform.mjs'
import { MOTION_STEP_FPS, sampleMotionTrack } from '../../lib/motion-track.mjs'
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
  const targetRef = useRef<HTMLSpanElement>(null)
  const [manualPosition, setManualPosition] = useState(0.18)
  const [paletteId, setPaletteId] = useState(DEFAULT_PIXEL_PALETTE_ID)
  const [settings, setSettings] = useState<MosaicSettings>(() => ({ ...DEFAULT_MOSAIC_SETTINGS }))
  const [videoIndex, setVideoIndex] = useState(0)
  const [houseId, setHouseId] = useState('house1')
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [webglReady, setWebglReady] = useState(false)
  const [webglError, setWebglError] = useState<string | null>(null)
  const playback = usePlaybackEngine()
  const recorder = useH264Recorder()
  const palette = useMemo(
    () => ({ ...getPixelPalettePreset(paletteId), background: settings.background }),
    [paletteId, settings.background]
  )
  const house = useMemo(() => getCctvHouse(houseId), [houseId])
  const showLiquidEffect = true
  const hasStarted = playback.status === 'playing' || playback.status === 'ended'
  const isReady = playback.status === 'ready' || hasStarted

  const handleWebglError = useCallback((message: string) => setWebglError(message), [])
  const handleWebglReady = useCallback(() => setWebglReady(true), [])
  const handleVideoRef = useCallback((node: HTMLVideoElement | null) => {
    playback.videoRef.current = node
    setWebglReady(false)
    setVideoElement(node)
  }, [playback.videoRef])
  const handleSettingsChange = useCallback((patch: Partial<MosaicSettings>) => {
    setSettings((current) => normalizeMosaicSettings({ ...current, ...patch }) as MosaicSettings)
  }, [])
  const playRandomNextVideo = useCallback(() => {
    setVideoIndex((current) => pickNextVideoIndex(current, MOSAIC_VIDEO_FILES.length))
  }, [])
  const handleVolumeChange = useCallback(
    (volume: number) => {
      const audio = playback.audioRef.current
      if (audio) audio.volume = Math.min(1, Math.max(0, volume))
    },
    [playback.audioRef]
  )
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
    const readHouse = () => {
      const value = new URLSearchParams(window.location.search).get('house')
      setHouseId(normalizeHouseId(value))
    }
    readHouse()
    window.addEventListener('popstate', readHouse)
    return () => window.removeEventListener('popstate', readHouse)
  }, [])

  useEffect(() => {
    const video = videoElement ?? playback.videoRef.current
    if (!video || playback.status === 'ended') return
    if (video.readyState === 0) video.load()
    void video.play().catch(() => {})
  }, [house.id, videoElement, playback.status, playback.videoRef])

  // The red target box follows the person in the clip. The clips are fixed, so where
  // the person is was worked out ahead of time (scripts/build-motion-track.mjs) and is
  // only looked up here by the video's own time.
  useEffect(() => {
    const video = videoElement
    if (!video) return undefined

    let cancelled = false
    let frame = 0
    let track: unknown = null
    fetch(assetPath(`media/tracks/${house.id}.json`))
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) track = data
      })
      .catch(() => {})

    const tick = () => {
      frame = window.requestAnimationFrame(tick)
      const target = targetRef.current
      if (!target) return
      if (!track) {
        target.dataset.tracking = 'off'
        return
      }
      const box = sampleMotionTrack(track, video.currentTime, MOTION_STEP_FPS)
      target.dataset.tracking = box.visible ? 'on' : 'lost'
      // Only the position follows the subject; the box keeps one fixed size.
      target.style.left = `${box.x * 100}%`
      target.style.top = `${box.y * 100}%`
    }
    frame = window.requestAnimationFrame(tick)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [house.id, videoElement])

  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0
  const activeError = webglError || playback.error || recorder.error
  const houseTitleCase = house.label.replace(/^./, (letter) => letter.toUpperCase())
  const waveformPaths = useMemo(
    () => [waveformPathFromSamples(playback.waveformSamples, 240)],
    [playback.waveformSamples]
  )

  return (
    <ExperienceFrame
      homeHref={assetPath('')}
      layoutClassName="experience-shell--cctv"
      navigationCurrent="cctv"
      mark={
        <div
          className="brand-mark"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: brandMarkSvg() }}
        />
      }
      panel={
        <ColorPanel
          selectedId={paletteId}
          onSelect={setPaletteId}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          selectedHouseId={house.id}
          houseLabel={house.label}
          houseTitle={house.title}
          currentTime={playback.currentTime}
          duration={playback.duration}
          isPlaying={playback.status === 'playing'}
          onSeek={playback.seek}
          onPrevious={() => void playback.restart()}
          onTogglePlayback={() => void playback.toggle()}
          onNext={playRandomNextVideo}
          onVolumeChange={handleVolumeChange}
        />
      }
    >
      <div className="stage-workspace cctv-layout">
        <header className="cctv-topbar" aria-label="재생과 저장">
          <div className="cctv-topbar-actions">
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
        </header>

        <section className="visual-stage cctv-video-frame" aria-label="픽셀 CCTV 재생 영역">
          <nav className="cctv-breadcrumb" aria-label="현재 위치">
            <span>Country</span>
            <i aria-hidden="true">&gt;</i>
            <span>{houseTitleCase}</span>
            <i aria-hidden="true">&gt;</i>
            <span>CCTV A</span>
          </nav>

          <div className="visual-stage-canvas cctv-stage-canvas">
            {showLiquidEffect && (
              <PixelCanvas
                video={videoElement}
                flowPosition={manualPosition}
                pulse={playback.glitch}
                settings={settings}
                playing={true}
                recording={recorder.recording}
                canvasRef={canvasRef}
                onError={handleWebglError}
                onReady={handleWebglReady}
              />
            )}

            <video
              key={house.id}
              ref={handleVideoRef}
              className={`source-media cctv-source-media${showLiquidEffect && webglReady ? ' is-enhanced' : ''}${!showLiquidEffect ? ' cctv-source-media--plain' : ''}`}
              data-palette-id={paletteId}
              src={assetPath(house.videoSrc)}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onEnded={playRandomNextVideo}
              aria-hidden="true"
            />
            <div className="cctv-hud" aria-hidden="true">
              <i className="cctv-hud-line cctv-hud-line--vertical" />
              <i className="cctv-hud-line cctv-hud-line--horizontal" />
              <i className="cctv-hud-ring" />
              <span className="cctv-hud-target" ref={targetRef} data-tracking="off">
                <b className="is-top-left" />
                <b className="is-top-right" />
                <b className="is-bottom-left" />
                <b className="is-bottom-right" />
                <em />
              </span>
            </div>
            <audio
              ref={playback.audioRef}
              className="source-media"
              src={assetPath('media/if-and-only-if.mp3')}
              preload="auto"
            />
          </div>

          <div className="cctv-footerbar">
            <DragControl
              value={manualPosition}
              onChange={setManualPosition}
              disabled={!isReady && playback.status === 'loading'}
            />
            {!recorder.supported && (
              <p className="support-note">
                H.264 MP4 저장은 지원 브라우저에서만 활성화됩니다. 화면 조작과 자동 Kick 반응은 그대로
                사용할 수 있습니다.
              </p>
            )}
            {activeError && (
              <p className="error-note" role="alert">
                {activeError}
              </p>
            )}
          </div>
        </section>

        <section className="cctv-timeline-panel" aria-label="재생 타임라인">
          <a className="cctv-overlay-back" href={assetPath('')} aria-label="메인 화면으로 이동">
            <span
              className="brand-mark"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: brandMarkSvg() }}
            />
          </a>
          <div className="cctv-timeline-scale" aria-hidden="true">
            <span>5</span>
            <span>0</span>
          </div>
          <div className="cctv-timeline-grid kick-monitor music-equalizer" aria-label="실시간 음악 웨이브폼">
            <svg
              className="equalizer-waveform"
              viewBox="0 0 240 72"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {waveformPaths.map((path, index) => (
                <path key={index} d={path} />
              ))}
            </svg>
            <div
              className="cctv-playhead"
              style={{ left: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="timeline-row cctv-timecodes">
            <span className="timecode">{formatTime(playback.currentTime)}</span>
            <div className="timeline" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} />
            </div>
            <span className="timecode">{formatTime(playback.duration)}</span>
          </div>
        </section>
      </div>
    </ExperienceFrame>
  )
}
