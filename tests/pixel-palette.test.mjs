import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shaderSource = readFileSync(new URL('../lib/pixel-shaders.ts', import.meta.url), 'utf8')

test('shader maps the four luminance bands to the approved palette', () => {
  assert.match(shaderSource, /vec3 backgroundColor = vec3\(0\.929412, 0\.925490, 0\.945098\)/)
  assert.match(shaderSource, /vec3 blue = vec3\(0\.603922, 0\.760784, 0\.941176\)/)
  assert.match(shaderSource, /vec3 red = vec3\(0\.717647, 0\.000000, 0\.000000\)/)
  assert.match(shaderSource, /mix\(backgroundColor, blue, diagonal \* border\)/)
  assert.match(shaderSource, /mix\(backgroundColor, red, ring \* border\)/)
  assert.match(shaderSource, /mix\(backgroundColor, blue, border\)/)
})

test('kick does not tint the shader output color', () => {
  assert.doesNotMatch(shaderSource, /uniform float uKick/)
  assert.doesNotMatch(shaderSource, /outputColor\s*\+=/)
})
