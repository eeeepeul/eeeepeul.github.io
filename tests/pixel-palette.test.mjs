import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shaderSource = readFileSync(new URL('../lib/pixel-shaders.ts', import.meta.url), 'utf8')

test('shader maps four luminance bands to independent palette uniforms', () => {
  assert.match(shaderSource, /uniform vec3 uBackgroundColor/)
  assert.match(shaderSource, /uniform vec3 uDiagonalColor/)
  assert.match(shaderSource, /uniform vec3 uCircleColor/)
  assert.match(shaderSource, /uniform vec3 uSolidColor/)
  assert.match(shaderSource, /mix\(uBackgroundColor, uDiagonalColor, diagonal \* border\)/)
  assert.match(shaderSource, /mix\(uBackgroundColor, uCircleColor, ring \* border\)/)
  assert.match(shaderSource, /mix\(uBackgroundColor, uSolidColor, border\)/)
  assert.doesNotMatch(shaderSource, /vec3 backgroundColor =/)
})

test('kick does not tint the shader output color', () => {
  assert.doesNotMatch(shaderSource, /uniform float uKick/)
  assert.doesNotMatch(shaderSource, /outputColor\s*\+=/)
})
