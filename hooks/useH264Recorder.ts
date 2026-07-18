'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { pickH264Mime } from '../lib/export-support.mjs'
import { EXPORT_HEIGHT, EXPORT_WIDTH } from '../lib/pixel-shaders'

export function useH264Recorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const captureTracksRef = useRef<MediaStreamTrack[]>([])
  const chunksRef = useRef<Blob[]>([])
  const [supported, setSupported] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupported(
      typeof MediaRecorder !== 'undefined' && Boolean(pickH264Mime(MediaRecorder.isTypeSupported))
    )
  }, [])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }, [])

  const startRecording = useCallback(
    async (canvas: HTMLCanvasElement | null, audioStream: MediaStream | null) => {
      setError(null)
      if (!canvas || !audioStream || typeof MediaRecorder === 'undefined') {
        setError('녹화할 영상 또는 오디오 스트림이 준비되지 않았습니다.')
        return false
      }
      const mimeType = pickH264Mime(MediaRecorder.isTypeSupported)
      if (!mimeType) {
        setError('이 브라우저는 H.264 MP4 녹화를 지원하지 않습니다.')
        return false
      }

      try {
        canvas.width = EXPORT_WIDTH
        canvas.height = EXPORT_HEIGHT
        const canvasStream = canvas.captureStream(30)
        const videoTracks = canvasStream.getVideoTracks()
        const audioTracks = audioStream.getAudioTracks()
        if (!videoTracks.length || !audioTracks.length) {
          videoTracks.forEach((track) => track.stop())
          throw new Error('녹화 트랙을 준비하지 못했습니다.')
        }
        captureTracksRef.current = videoTracks
        const stream = new MediaStream([...videoTracks, ...audioTracks])
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 8_000_000,
          audioBitsPerSecond: 192_000,
        })
        chunksRef.current = []
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.onerror = () => {
          setError('녹화 중 오류가 발생했습니다. 손상된 파일은 저장하지 않았습니다.')
          chunksRef.current = []
        }
        recorder.onstop = () => {
          captureTracksRef.current.forEach((track) => track.stop())
          captureTracksRef.current = []
          setRecording(false)
          recorderRef.current = null
          if (!chunksRef.current.length) return
          const blob = new Blob(chunksRef.current, { type: 'video/mp4' })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = 'if-and-only-if-pixel-cctv.mp4'
          anchor.click()
          window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          chunksRef.current = []
        }
        recorderRef.current = recorder
        recorder.start(1000)
        setRecording(true)
        return true
      } catch (caught) {
        captureTracksRef.current.forEach((track) => track.stop())
        captureTracksRef.current = []
        setRecording(false)
        setError(caught instanceof Error ? caught.message : 'H.264 녹화를 시작하지 못했습니다.')
        return false
      }
    },
    []
  )

  useEffect(() => () => stopRecording(), [stopRecording])

  return { supported, recording, error, startRecording, stopRecording }
}
