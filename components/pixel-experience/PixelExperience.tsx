'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { effectiveTiles, manualTilesFromPosition } from '../../lib/pixel-controls.mjs'
import { useH264Recorder } from '../../hooks/useH264Recorder'
import { usePlaybackEngine } from '../../hooks/usePlaybackEngine'
import { DragControl } from './DragControl'
import { ExportButton } from './ExportButton'
import { PixelCanvas } from './PixelCanvas'

function formatTime(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const minutes = Math.floor(safeValue / 60)
  const seconds = Math.floor(safeValue % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function PixelExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [manualPosition, setManualPosition] = useState(0.54)
  const [webglError, setWebglError] = useState<string | null>(null)
  const playback = usePlaybackEngine()
  const recorder = useH264Recorder()
  const baseTiles = useMemo(() => manualTilesFromPosition(manualPosition), [manualPosition])
  const tiles = useMemo(() => effectiveTiles(baseTiles, playback.kick), [baseTiles, playback.kick])
  const hasStarted = playback.status === 'playing' || playback.status === 'ended'
  const isReady = playback.status === 'ready' || hasStarted

  const handleWebglError = useCallback((message: string) => setWebglError(message), [])
  const handleExport = useCallback(async () => {
    const started = await recorder.startRecording(canvasRef.current, playback.recordingAudioStream)
    if (started) await playback.restart()
  }, [playback, recorder])

  useEffect(() => {
    if (playback.status === 'ended' && recorder.recording) recorder.stopRecording()
  }, [playback.status, recorder])

  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0
  const activeError = webglError || playback.error || recorder.error

  return (
    <main className="experience-shell">
      <header className="site-header">
        <p className="eyebrow">IF AND ONLY IF / 02</p>
        <div className="header-title">
          <h1>PIXEL CCTV</h1>
          <p>각자의 손끝, 하나의 자동 Kick.</p>
        </div>
        <div className="status-cluster" aria-live="polite">
          <span className={`status-light ${playback.status === 'playing' ? 'is-live' : ''}`} />
          {recorder.recording ? 'REC / 1920×1080' : playback.status === 'playing' ? 'LIVE' : 'LOCAL'}
        </div>
      </header>

      <section className="visual-stage" aria-label="픽셀 CCTV 재생 영역">
        <PixelCanvas
          video={playback.videoRef.current}
          tiles={tiles}
          playing={true}
          recording={recorder.recording}
          canvasRef={canvasRef}
          onError={handleWebglError}
        />

        <video
          ref={playback.videoRef}
          className="source-media"
          src={assetPath('media/cctv-1080p.mp4')}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <audio
          ref={playback.audioRef}
          className="source-media"
          src={assetPath('media/if-and-only-if.mp3')}
          preload="auto"
        />

        <div className="stage-meta top-meta" aria-hidden="true">
          <span>CAM 01</span>
          <span>4 BAND PATTERN</span>
        </div>
        <div className="stage-meta bottom-meta" aria-hidden="true">
          <span>{tiles.toString().padStart(3, '0')} COL</span>
          <span>KICK {Math.round(playback.kick * 100).toString().padStart(3, '0')}</span>
        </div>

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

      <footer className="site-footer">
        <span>VIDEO LOOP / AUDIO MASTER</span>
        <span>YOUR INPUT STAYS ON THIS DEVICE</span>
      </footer>
    </main>
  )
}
