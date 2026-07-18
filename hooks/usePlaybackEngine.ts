'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { bandEnergy, nextKickEnvelope } from '../lib/kick-envelope.mjs'
import { loopedVideoTime, shouldCorrectVideo } from '../lib/media-sync.mjs'
import { withTimeout } from '../lib/promise-timeout.mjs'

export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'ended' | 'error'

type AudioGraph = {
  context: AudioContext
  source: MediaElementAudioSourceNode
  analyser: AnalyserNode
  recording: MediaStreamAudioDestinationNode
  frequencyData: Uint8Array<ArrayBuffer>
}

export function usePlaybackEngine() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const graphRef = useRef<AudioGraph | null>(null)
  const animationRef = useRef(0)
  const lastFrameRef = useRef(0)
  const lastCorrectionRef = useRef(0)
  const kickStateRef = useRef({ floor: 0.05, envelope: 0 })
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [kick, setKick] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(264.072)
  const [error, setError] = useState<string | null>(null)
  const [recordingAudioStream, setRecordingAudioStream] = useState<MediaStream | null>(null)

  const ensureGraph = useCallback(async () => {
    if (graphRef.current) return graphRef.current
    const audio = audioRef.current
    if (!audio) throw new Error('오디오 요소를 준비하지 못했습니다.')

    const AudioContextConstructor = window.AudioContext
    const context = new AudioContextConstructor()
    const source = context.createMediaElementSource(audio)
    const analyser = context.createAnalyser()
    const recording = context.createMediaStreamDestination()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.18
    source.connect(analyser)
    analyser.connect(context.destination)
    analyser.connect(recording)

    const graph: AudioGraph = {
      context,
      source,
      analyser,
      recording,
      frequencyData: new Uint8Array(analyser.frequencyBinCount),
    }
    graphRef.current = graph
    setRecordingAudioStream(recording.stream)
    return graph
  }, [])

  const syncVideo = useCallback((force = false) => {
    const audio = audioRef.current
    const video = videoRef.current
    if (!audio || !video || !Number.isFinite(video.duration) || video.duration <= 0) return
    const expected = loopedVideoTime(audio.currentTime, video.duration)
    const now = performance.now()
    if (
      force ||
      shouldCorrectVideo(
        video.currentTime,
        expected,
        video.duration,
        video.seeking,
        now,
        lastCorrectionRef.current
      )
    ) {
      video.currentTime = expected
      lastCorrectionRef.current = now
    }
  }, [])

  const runAnalysis = useCallback(
    (now: number) => {
      const graph = graphRef.current
      const audio = audioRef.current
      if (!graph || !audio || audio.paused || audio.ended) return

      const delta = lastFrameRef.current ? Math.min(250, now - lastFrameRef.current) : 16
      lastFrameRef.current = now
      graph.analyser.getByteFrequencyData(graph.frequencyData)
      const energy = bandEnergy(
        graph.frequencyData,
        graph.context.sampleRate,
        graph.analyser.fftSize,
        40,
        160
      )
      kickStateRef.current = nextKickEnvelope(kickStateRef.current, energy, delta)
      setKick(kickStateRef.current.envelope)
      setCurrentTime(audio.currentTime)
      syncVideo()
      animationRef.current = window.requestAnimationFrame(runAnalysis)
    },
    [syncVideo]
  )

  const begin = useCallback(
    async (fromStart: boolean) => {
      const audio = audioRef.current
      const video = videoRef.current
      if (!audio || !video) return false

      try {
        setError(null)
        setStatus('loading')
        const graph = await ensureGraph()
        await withTimeout(
          graph.context.resume(),
          5000,
          '오디오 장치를 시작하지 못했습니다. 다른 브라우저에서 다시 시도해주세요.'
        )
        if (fromStart) {
          audio.currentTime = 0
          video.currentTime = 0
          setCurrentTime(0)
          kickStateRef.current = { floor: 0.05, envelope: 0 }
        } else {
          video.currentTime = loopedVideoTime(audio.currentTime, video.duration || 1)
        }
        video.loop = true
        video.muted = true
        lastCorrectionRef.current = performance.now()
        await withTimeout(
          Promise.all([video.play(), audio.play()]),
          5000,
          '영상 또는 음원 재생이 지연되고 있습니다. 다시 시도해주세요.'
        )
        window.cancelAnimationFrame(animationRef.current)
        lastFrameRef.current = 0
        setStatus('playing')
        animationRef.current = window.requestAnimationFrame(runAnalysis)
        return true
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : '미디어 재생을 시작하지 못했습니다.'
        setError(message)
        setStatus('error')
        return false
      }
    },
    [ensureGraph, runAnalysis]
  )

  const start = useCallback(() => begin(true), [begin])
  const restart = useCallback(() => begin(true), [begin])

  useEffect(() => {
    const audio = audioRef.current
    const video = videoRef.current
    if (!audio || !video) return

    const markReady = () => {
      if (audio.readyState >= 1 && video.readyState >= 1) {
        setStatus((current) =>
          current === 'idle' || current === 'loading' ? 'ready' : current
        )
      }
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration)
    }
    const fail = () => {
      setError('영상 또는 음원을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.')
      setStatus('error')
    }
    const end = () => {
      window.cancelAnimationFrame(animationRef.current)
      video.pause()
      setCurrentTime(audio.duration || 264.072)
      setKick(0)
      setStatus('ended')
    }
    const visible = () => {
      if (!document.hidden) syncVideo(true)
    }

    audio.addEventListener('loadedmetadata', markReady)
    video.addEventListener('loadedmetadata', markReady)
    audio.addEventListener('ended', end)
    audio.addEventListener('error', fail)
    video.addEventListener('error', fail)
    document.addEventListener('visibilitychange', visible)
    markReady()

    return () => {
      audio.removeEventListener('loadedmetadata', markReady)
      video.removeEventListener('loadedmetadata', markReady)
      audio.removeEventListener('ended', end)
      audio.removeEventListener('error', fail)
      video.removeEventListener('error', fail)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [syncVideo])

  useEffect(
    () => () => {
      window.cancelAnimationFrame(animationRef.current)
      const graph = graphRef.current
      if (graph) {
        graph.source.disconnect()
        graph.analyser.disconnect()
        void graph.context.close()
      }
    },
    []
  )

  return {
    status,
    kick,
    currentTime,
    duration,
    error,
    start,
    restart,
    audioRef,
    videoRef,
    recordingAudioStream,
  }
}
