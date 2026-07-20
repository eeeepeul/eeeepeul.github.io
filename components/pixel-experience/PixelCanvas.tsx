'use client'

import { useEffect, useRef } from 'react'
import { EXPORT_HEIGHT, EXPORT_WIDTH, FRAGMENT_SHADER, VERTEX_SHADER } from '../../lib/pixel-shaders'

type PixelCanvasProps = {
  video: HTMLVideoElement | null
  tiles: number
  playing: boolean
  recording: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onError: (message: string) => void
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

function createProgram(gl: WebGLRenderingContext) {
  const program = gl.createProgram()
  if (!program) throw new Error('WebGL 프로그램을 만들 수 없습니다.')
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
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

export function PixelCanvas({
  video,
  tiles,
  playing,
  recording,
  canvasRef,
  onError,
}: PixelCanvasProps) {
  const valuesRef = useRef({ video, tiles, playing, recording })
  const wakeRendererRef = useRef<() => void>(() => {})

  useEffect(() => {
    valuesRef.current = { video, tiles, playing, recording }
    wakeRendererRef.current()
  }, [video, tiles, playing, recording])

  useEffect(() => {
    const canvas = canvasRef.current
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

    let program: WebGLProgram | null = null
    let buffer: WebGLBuffer | null = null
    let texture: WebGLTexture | null = null
    let frame = 0
    let lastFrame = 0

    try {
      program = createProgram(gl)
      buffer = gl.createBuffer()
      texture = gl.createTexture()
      if (!buffer || !texture) throw new Error('WebGL 버퍼를 준비할 수 없습니다.')

      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      )
      const position = gl.getAttribLocation(program, 'aPosition')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
      gl.uniform1i(gl.getUniformLocation(program, 'uVideo'), 0)
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
      if (!program || !texture || !current.video || current.video.readyState < 2) {
        if (current.playing) wake()
        return
      }

      try {
        gl.useProgram(program)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, current.video)
        gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), canvas.width, canvas.height)
        gl.uniform1f(gl.getUniformLocation(program, 'uColumns'), current.tiles)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
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
    observer.observe(canvas)
    const wakeForMedia = () => wake()
    valuesRef.current.video?.addEventListener('loadeddata', wakeForMedia)
    wakeRendererRef.current = wake
    resize()
    wake()

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
      valuesRef.current.video?.removeEventListener('loadeddata', wakeForMedia)
      wakeRendererRef.current = () => {}
      if (texture) gl.deleteTexture(texture)
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
    }
  }, [canvasRef, onError])

  return <canvas ref={canvasRef} className="pixel-canvas" aria-label="Kick에 반응하는 픽셀 CCTV 영상" />
}
