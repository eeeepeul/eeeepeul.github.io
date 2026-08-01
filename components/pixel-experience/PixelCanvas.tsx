'use client'

import { useEffect, useRef } from 'react'
import { DEFAULT_PIXEL_PALETTE, hexToUnitRgb } from '../../lib/pixel-palette.mjs'
import { EXPORT_HEIGHT, EXPORT_WIDTH, FRAGMENT_SHADER, VERTEX_SHADER } from '../../lib/pixel-shaders'
import type { MosaicSettings } from './SettingsPanel'

type PixelPalette = {
  background: string
  diagonal: string
  circle: string
  solid: string
  glyph: string
}
type CharacterSetPreset = {
  id: string
  characters: string
  useAtlas: boolean
}

type PixelCanvasProps = {
  video: HTMLVideoElement | null
  tiles: number
  glitch: number
  palette: PixelPalette
  settings: MosaicSettings
  characterSet: CharacterSetPreset
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

function createGlyphAtlas(characters: string) {
  const glyphs = Array.from(characters).slice(0, 32)
  const cellWidth = 42
  const cellHeight = 64
  const atlas = document.createElement('canvas')
  atlas.width = Math.max(1, glyphs.length) * cellWidth
  atlas.height = cellHeight
  const context = atlas.getContext('2d', { alpha: false })
  if (!context) throw new Error('문자 세트 텍스처를 만들 수 없습니다.')

  context.fillStyle = '#000000'
  context.fillRect(0, 0, atlas.width, atlas.height)
  context.fillStyle = '#FFFFFF'
  context.font = '700 56px "Courier New", Menlo, Monaco, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  glyphs.forEach((glyph, index) => {
    context.fillText(glyph, index * cellWidth + cellWidth / 2, cellHeight / 2 + 2)
  })

  return { atlas, count: Math.max(1, glyphs.length) }
}

export function PixelCanvas({
  video,
  tiles,
  glitch,
  palette,
  settings,
  characterSet,
  playing,
  recording,
  canvasRef,
  onError,
}: PixelCanvasProps) {
  const valuesRef = useRef({
    video,
    tiles,
    glitch,
    palette,
    settings,
    characterSet,
    playing,
    recording,
  })
  const wakeRendererRef = useRef<() => void>(() => {})

  useEffect(() => {
    valuesRef.current = {
      video,
      tiles,
      glitch,
      palette,
      settings,
      characterSet,
      playing,
      recording,
    }
    wakeRendererRef.current()
  }, [video, tiles, glitch, palette, settings, characterSet, playing, recording])

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
    let videoTexture: WebGLTexture | null = null
    let glyphTexture: WebGLTexture | null = null
    let glyphAtlasKey = ''
    let glyphCount = 1
    let frame = 0
    let lastFrame = 0

    try {
      program = createProgram(gl)
      buffer = gl.createBuffer()
      videoTexture = gl.createTexture()
      glyphTexture = gl.createTexture()
      if (!buffer || !videoTexture || !glyphTexture) {
        throw new Error('WebGL 버퍼를 준비할 수 없습니다.')
      }

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
      gl.bindTexture(gl.TEXTURE_2D, videoTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
      gl.uniform1i(gl.getUniformLocation(program, 'uVideo'), 0)

      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, glyphTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255])
      )
      gl.uniform1i(gl.getUniformLocation(program, 'uGlyphAtlas'), 1)
      gl.activeTexture(gl.TEXTURE0)
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
      if (!program || !videoTexture || !glyphTexture || !current.video || current.video.readyState < 2) {
        if (current.playing) wake()
        return
      }

      try {
        gl.useProgram(program)
        if (current.characterSet.useAtlas && glyphAtlasKey !== current.characterSet.id) {
          const generated = createGlyphAtlas(current.characterSet.characters)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, glyphTexture)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            generated.atlas
          )
          glyphAtlasKey = current.characterSet.id
          glyphCount = generated.count
        }
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, videoTexture)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, current.video)
        gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), canvas.width, canvas.height)
        gl.uniform1f(gl.getUniformLocation(program, 'uColumns'), current.tiles)
        gl.uniform1f(gl.getUniformLocation(program, 'uGlitch'), current.glitch)
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), now / 1000)
        gl.uniform1f(gl.getUniformLocation(program, 'uSpacing'), current.settings.spacing)
        gl.uniform1f(gl.getUniformLocation(program, 'uBrightness'), current.settings.brightness / 100)
        gl.uniform1f(gl.getUniformLocation(program, 'uContrast'), current.settings.contrast / 100)
        gl.uniform1f(gl.getUniformLocation(program, 'uSaturation'), current.settings.saturation / 100)
        gl.uniform1f(gl.getUniformLocation(program, 'uHue'), current.settings.hue * Math.PI / 180)
        gl.uniform1f(gl.getUniformLocation(program, 'uSharpness'), current.settings.sharpness / 100)
        gl.uniform1f(gl.getUniformLocation(program, 'uGamma'), current.settings.gamma)
        gl.uniform1f(
          gl.getUniformLocation(program, 'uColorMode'),
          current.settings.colorMode === 'mono' ? 1 : 0
        )
        gl.uniform1f(gl.getUniformLocation(program, 'uIntensity'), current.settings.intensity)
        gl.uniform1f(
          gl.getUniformLocation(program, 'uUseGlyphAtlas'),
          current.characterSet.useAtlas ? 1 : 0
        )
        gl.uniform1f(gl.getUniformLocation(program, 'uGlyphCount'), glyphCount)
        gl.uniform3fv(
          gl.getUniformLocation(program, 'uBackgroundColor'),
          hexToUnitRgb(current.palette.background, DEFAULT_PIXEL_PALETTE.background)
        )
        gl.uniform3fv(
          gl.getUniformLocation(program, 'uDiagonalColor'),
          hexToUnitRgb(current.palette.diagonal, DEFAULT_PIXEL_PALETTE.diagonal)
        )
        gl.uniform3fv(
          gl.getUniformLocation(program, 'uCircleColor'),
          hexToUnitRgb(current.palette.circle, DEFAULT_PIXEL_PALETTE.circle)
        )
        gl.uniform3fv(
          gl.getUniformLocation(program, 'uSolidColor'),
          hexToUnitRgb(current.palette.solid, DEFAULT_PIXEL_PALETTE.solid)
        )
        gl.uniform3fv(
          gl.getUniformLocation(program, 'uGlyphColor'),
          hexToUnitRgb(current.palette.glyph, DEFAULT_PIXEL_PALETTE.glyph)
        )
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
      if (glyphTexture) gl.deleteTexture(glyphTexture)
      if (videoTexture) gl.deleteTexture(videoTexture)
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
    }
  }, [canvasRef, onError])

  return <canvas ref={canvasRef} className="pixel-canvas" aria-label="Kick에 반응하는 픽셀 CCTV 영상" />
}
