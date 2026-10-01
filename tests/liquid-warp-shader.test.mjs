import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shaderSource = await readFile(
  new URL('../lib/liquid-warp-shader.ts', import.meta.url),
  'utf8'
)
const canvasSource = await readFile(
  new URL('../components/pixel-experience/PixelCanvas.tsx', import.meta.url),
  'utf8'
)

test('keeps the CCTV shader on the original video colors', () => {
  assert.match(shaderSource, /uniform sampler2D uVideo;/)
  assert.match(shaderSource, /texture2D\(uVideo, warpedUv\)/)
  assert.doesNotMatch(shaderSource, /uBackgroundColor|uDarkColor|uMidColor|uLightColor/)
  assert.doesNotMatch(shaderSource, /paletteMap|solarized|pigmentInjectionColor/)
})

test('uses the liquid controls to move the source sampling coordinates', () => {
  assert.match(shaderSource, /uniform float uFlowFrequency;/)
  assert.match(shaderSource, /uniform float uWarpStrength;/)
  assert.match(shaderSource, /uniform float uFoldDisplacement;/)
  assert.match(shaderSource, /uniform float uFoldVelocity;/)
  assert.match(shaderSource, /uniform float uTangentFan;/)
  assert.match(shaderSource, /uniform float uVerticalSmear;/)
  assert.match(shaderSource, /vec2 warpedUv = clamp\(/)
  assert.match(shaderSource, /warpAmplitude/)
})

test('bypasses all displacement when scale and spacing are both zero', () => {
  assert.match(shaderSource, /max\(0\.0, uWarpStrength - 0\.002\)/)
  assert.match(shaderSource, /max\(0\.0, uFoldDisplacement - 0\.010\)/)
  assert.match(shaderSource, /max\(0\.0, uTangentFan - 0\.08\)/)
  assert.match(shaderSource, /max\(0\.0, uVerticalSmear - 0\.014\)/)
  assert.match(shaderSource, /float controlGate = step\(/)
  assert.match(shaderSource, /uKick \* 0\.012 \* controlGate/)
  assert.match(shaderSource, /if \(controlGate < 0\.5\)/)
  assert.match(shaderSource, /gl_FragColor = texture2D\(uVideo, vUv\);\s*return;/)
})

test('uses the feedback texture only as an optional geometric reference, never as a color layer', () => {
  assert.doesNotMatch(shaderSource, /texture2D\(uFeedback/)
  assert.match(shaderSource, /gl_FragColor = texture2D\(uVideo, warpedUv\)/)
})

test('uses the color-preserving shader in the live CCTV canvas', () => {
  assert.match(canvasSource, /liquid-warp-shader/)
  assert.doesNotMatch(canvasSource, /solarize-shader/)
  assert.doesNotMatch(canvasSource, /uSolarizeStrength|uBackgroundColor|uDarkColor|uMidColor|uLightColor/)
})
