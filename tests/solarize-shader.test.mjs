import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shaderSource = await readFile(
  new URL('../lib/solarize-shader.ts', import.meta.url),
  'utf8'
)

test('maps the solarized silhouette through the selected sidebar palette', () => {
  assert.match(shaderSource, /uniform vec3 uBackgroundColor;/)
  assert.match(shaderSource, /uniform vec3 uDarkColor;/)
  assert.match(shaderSource, /uniform vec3 uMidColor;/)
  assert.match(shaderSource, /uniform vec3 uLightColor;/)
  assert.match(shaderSource, /vec3 paletteMap\(float tone, float grain\)/)
  assert.doesNotMatch(shaderSource, /vec4\(vec3\(tone\),1\.0\)/)
})

test('builds a pale clipped silhouette with chromatic texture instead of monochrome bands', () => {
  assert.match(shaderSource, /float silhouette = smoothstep\(/)
  assert.match(shaderSource, /float solarized = 1\.0 - abs\(/)
  assert.match(shaderSource, /float chromaNoise =/)
  assert.match(shaderSource, /mix\(paletteColor, paleSilhouette, silhouette\)/)
})

test('uses pattern scale for solarize repetition, threshold detail, and grain density', () => {
  assert.match(shaderSource, /float repetitions = mix\(/)
  assert.match(shaderSource, /float detailThreshold = mix\(/)
  assert.match(shaderSource, /vec2 grainCell = floor\(/)
  assert.match(shaderSource, /uSolarizeStrength/)
})

test('iteratively accumulates and fades previous solarized frames like the tutorial feedback loop', () => {
  assert.match(shaderSource, /uniform sampler2D uFeedback;/)
  assert.match(shaderSource, /vec3 previous = texture2D\(uFeedback,/)
  assert.match(shaderSource, /float feedbackRetention = mix\(/)
  assert.match(shaderSource, /mix\(color, previous, feedbackRetention\)/)
})
