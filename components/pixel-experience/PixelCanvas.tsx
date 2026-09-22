'use client'

import { useEffect, useRef } from 'react'
import { LIQUID_WARP_FRAGMENT_SHADER as FRAGMENT_SHADER } from '../../lib/liquid-warp-shader'
import { resolveLiquidControls } from '../../lib/liquid-controls.mjs'
import {
  DISPLAY_FRAGMENT_SHADER,
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  VERTEX_SHADER,
} from '../../lib/pixel-shaders'
import type { MosaicSettings } from './SettingsPanel'

type PixelCanvasProps = {
  video: HTMLVideoElement | null
  flowPosition: number
  pulse: number
  settings: MosaicSettings
  playing: boolean
  recording: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onError: (message: string) => void
  onReady?: () => void
}

type FeedbackTarget = {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
  width: number
  height: number
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('셰이더를 만들 수 없습니다.')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || '셰이더 컴파일에 실패했습니다.'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext, fragmentSource: string) {
  const program = gl.createProgram()
  if (!program) throw new Error('WebGL 프로그램을 만들 수 없습니다.')
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'WebGL 프로그램 연결에 실패했습니다.'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}

function createFeedbackTarget(
  gl: WebGLRenderingContext,
  width: number,
  height: number
): FeedbackTarget {
  const texture = gl.createTexture()
  const framebuffer = gl.createFramebuffer()
  if (!texture || !framebuffer) {
    if (texture) gl.deleteTexture(texture)
    if (framebuffer) gl.deleteFramebuffer(framebuffer)
    throw new Error('액상 피드백 버퍼를 준비할 수 없습니다.')
  }

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  )

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  )
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(texture)
    gl.deleteFramebuffer(framebuffer)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    throw new Error('액상 피드백 화면을 완성할 수 없습니다.')
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  return { texture, framebuffer, width, height }
}

function destroyFeedbackTarget(gl: WebGLRenderingContext, target: FeedbackTarget) {
  gl.deleteFramebuffer(target.framebuffer)
  gl.deleteTexture(target.texture)
}

function bindFullscreenBuffer(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  buffer: WebGLBuffer
) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  const position = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
}

export function PixelCanvas({
  video,
  flowPosition,
  pulse,
  settings,
  playing,
  recording,
  canvasRef,
  onError,
  onReady,
}: PixelCanvasProps) {
  const localCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const readyRef = useRef(false)
  const valuesRef = useRef({
    video,
    flowPosition,
    pulse,
    settings,
    playing,
    recording,
  })
  const wakeRendererRef = useRef<() => void>(() => {})

  useEffect(() => {
    valuesRef.current = {
      video,
      flowPosition,
      pulse,
      settings,
      playing,
      recording,
    }
    wakeRendererRef.current()
  }, [video, flowPosition, pulse, settings, playing, recording])

  useEffect(() => {
    const canvas = localCanvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })

    if (!gl) {
      onError('이 브라우저에서 WebGL을 시작할 수 없습니다.')
      return
    }

    let feedbackProgram: WebGLProgram | null = null
    let displayProgram: WebGLProgram | null = null
    let buffer: WebGLBuffer | null = null
    let videoTexture: WebGLTexture | null = null
    let feedbackTargets: [FeedbackTarget, FeedbackTarget] | null = null
    let readTargetIndex = 0
    let feedbackKey = ''
    let frame = 0
    let lastFrame = 0

    const destroyFeedbackTargets = () => {
      if (!feedbackTargets) return
      destroyFeedbackTarget(gl, feedbackTargets[0])
      destroyFeedbackTarget(gl, feedbackTargets[1])
      feedbackTargets = null
    }

    const clearFeedbackTargets = () => {
      if (!feedbackTargets) return
      gl.clearColor(0, 0, 0, 0)
      for (const target of feedbackTargets) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
        gl.viewport(0, 0, target.width, target.height)
        gl.clear(gl.COLOR_BUFFER_BIT)
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      readTargetIndex = 0
    }

    const ensureFeedbackTargets = () => {
      if (
        feedbackTargets
        && feedbackTargets[0].width === canvas.width
        && feedbackTargets[0].height === canvas.height
      ) return

      destroyFeedbackTargets()
      feedbackTargets = [
        createFeedbackTarget(gl, canvas.width, canvas.height),
        createFeedbackTarget(gl, canvas.width, canvas.height),
      ]
      feedbackKey = ''
      clearFeedbackTargets()
    }

    try {
      feedbackProgram = createProgram(gl, FRAGMENT_SHADER)
      displayProgram = createProgram(gl, DISPLAY_FRAGMENT_SHADER)
      buffer = gl.createBuffer()
      videoTexture = gl.createTexture()
      if (!buffer || !videoTexture) throw new Error('WebGL 버퍼를 준비할 수 없습니다.')

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      )

      gl.bindTexture(gl.TEXTURE_2D, videoTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'WebGL 초기화에 실패했습니다.')
      return
    }

    const resize = () => {
      const current = valuesRef.current
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = current.recording
        ? EXPORT_WIDTH
        : Math.min(EXPORT_WIDTH, Math.max(640, Math.round(canvas.clientWidth * dpr)))
      const height = current.recording
        ? EXPORT_HEIGHT
        : Math.round(width * (EXPORT_HEIGHT / EXPORT_WIDTH))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
      ensureFeedbackTargets()
    }

    const draw = (now: number) => {
      frame = 0
      const current = valuesRef.current
      if (now - lastFrame < 1000 / 30) {
        if (current.playing) wake()
        return
      }
      lastFrame = now
      resize()
      if (
        !feedbackProgram
        || !displayProgram
        || !buffer
        || !videoTexture
        || !feedbackTargets
        || !current.video
        || current.video.readyState < 2
      ) {
        if (current.playing) wake()
        return
      }

      try {
        const nextFeedbackKey = `${current.video.currentSrc}:${canvas.width}x${canvas.height}`
        if (feedbackKey !== nextFeedbackKey) {
          feedbackKey = nextFeedbackKey
          clearFeedbackTargets()
        }

        const readTarget = feedbackTargets[readTargetIndex]
        const writeTarget = feedbackTargets[1 - readTargetIndex]
        const controls = resolveLiquidControls({
          position: current.flowPosition,
          scale: current.settings.scale,
          diffusion: current.settings.spacing,
          pulse: current.pulse,
        })

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, videoTexture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, current.video)

        gl.bindFramebuffer(gl.FRAMEBUFFER, writeTarget.framebuffer)
        gl.viewport(0, 0, writeTarget.width, writeTarget.height)
        gl.useProgram(feedbackProgram)
        bindFullscreenBuffer(gl, feedbackProgram, buffer)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, videoTexture)
        gl.uniform1i(gl.getUniformLocation(feedbackProgram, 'uVideo'), 0)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, readTarget.texture)
        gl.uniform1i(gl.getUniformLocation(feedbackProgram, 'uFeedback'), 1)
        gl.uniform2f(
          gl.getUniformLocation(feedbackProgram, 'uResolution'),
          canvas.width,
          canvas.height
        )
        gl.uniform1f(gl.getUniformLocation(feedbackProgram, 'uTime'), now / 1000)
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uFlowFrequency'),
          controls.flowFrequency
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uWarpStrength'),
          controls.warpStrength
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uFoldDisplacement'),
          controls.foldDisplacement
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uFoldVelocity'),
          controls.foldVelocity
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uTangentFan'),
          controls.tangentFan
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uVerticalSmear'),
          controls.verticalSmear
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uFeedbackRetention'),
          controls.feedbackRetention
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uHistoryColorRetention'),
          controls.historyColorRetention
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uShadowMassStrength'),
          controls.shadowMassStrength
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uSourceMix'),
          controls.sourceMix
        )
        gl.uniform1f(gl.getUniformLocation(feedbackProgram, 'uBloom'), controls.bloom)
        gl.uniform1f(gl.getUniformLocation(feedbackProgram, 'uKick'), current.pulse)
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uBrightness'),
          current.settings.brightness / 100
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uContrast'),
          current.settings.contrast / 100
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uSaturation'),
          current.settings.saturation / 100
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uHue'),
          current.settings.hue * Math.PI / 180
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uSharpness'),
          current.settings.sharpness / 100
        )
        gl.uniform1f(gl.getUniformLocation(feedbackProgram, 'uGamma'), current.settings.gamma)
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uColorMode'),
          current.settings.colorMode === 'mono' ? 1 : 0
        )
        gl.uniform1f(
          gl.getUniformLocation(feedbackProgram, 'uIntensity'),
          current.settings.intensity
        )
        gl.drawArrays(gl.TRIANGLES, 0, 6)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.useProgram(displayProgram)
        bindFullscreenBuffer(gl, displayProgram, buffer)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, writeTarget.texture)
        gl.uniform1i(gl.getUniformLocation(displayProgram, 'uTexture'), 0)
        gl.drawArrays(gl.TRIANGLES, 0, 6)

        readTargetIndex = 1 - readTargetIndex
        if (!readyRef.current) {
          readyRef.current = true
          onReady?.()
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : '영상 프레임을 그리지 못했습니다.')
        return
      }
      if (current.playing) wake()
    }

    const wake = () => {
      if (!frame) frame = window.requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(() => {
      resize()
      wake()
    })
    // The canvas is positioned inside the fixed CCTV stage. Observe the stage
    // container as well as the canvas so an early 300×150 intrinsic canvas size
    // cannot become the renderer's permanent backing resolution.
    observer.observe(canvas)
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    wakeRendererRef.current = wake
    resize()
    window.requestAnimationFrame(() => {
      resize()
      wake()
    })
    wake()

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
      wakeRendererRef.current = () => {}
      destroyFeedbackTargets()
      if (videoTexture) gl.deleteTexture(videoTexture)
      if (buffer) gl.deleteBuffer(buffer)
      if (displayProgram) gl.deleteProgram(displayProgram)
      if (feedbackProgram) gl.deleteProgram(feedbackProgram)
    }
  }, [canvasRef, onError, onReady])

  return (
    <canvas
      ref={(node) => {
        localCanvasRef.current = node
        canvasRef.current = node
      }}
      width={EXPORT_WIDTH}
      height={EXPORT_HEIGHT}
      className="pixel-canvas"
      aria-label="Kick에 반응하는 액상 안료 CCTV 영상"
    />
  )
}
