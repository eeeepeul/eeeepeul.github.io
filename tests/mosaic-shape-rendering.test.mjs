import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shader = readFileSync(new URL('../lib/pixel-shaders.ts', import.meta.url), 'utf8')
const canvas = readFileSync(
  new URL('../components/pixel-experience/PixelCanvas.tsx', import.meta.url),
  'utf8'
)

test('passes the normalized mosaic shape into the WebGL shader', () => {
  assert.match(canvas, /getMosaicShapePreset/)
  assert.match(
    canvas,
    /getUniformLocation\(program,\s*'uShapeMode'\)[\s\S]*getMosaicShapePreset\(current\.settings\.shape\)\.shaderMode/
  )
  assert.match(shader, /uniform float uShapeMode;/)
})

test('renders circle and square cells with the same three palette roles as M O E', () => {
  assert.match(shader, /float circleMask\(vec2 local, float luma\)/)
  assert.match(shader, /float squareMask\(vec2 local, float luma\)/)
  assert.match(shader, /if \(uShapeMode > 0\.5 && uShapeMode < 1\.5\)/)
  assert.match(shader, /if \(uShapeMode >= 1\.5\)/)
  assert.match(shader, /glyph = circleMask\(tileLocal, inkLuma\) \* insideTile;/)
  assert.match(shader, /glyph = squareMask\(tileLocal, inkLuma\) \* insideTile;/)
  assert.doesNotMatch(shader, /if \(uShapeMode >= 1\.5\) \{\s*glyph = insideTile;/)
  assert.match(shader, /vec3 roleColor = uDiagonalColor;/)
  assert.match(shader, /inkLuma >= \$\{E_TO_O\}[\s\S]*roleColor = uCircleColor;/)
  assert.match(shader, /inkLuma >= \$\{O_TO_M\}[\s\S]*roleColor = uSolidColor;/)
  assert.doesNotMatch(shader, /if \(uShapeMode > 0\.5\)\s*roleColor = uCircleColor;/)
})

test('keeps the darkest circle and square visible so the E color is rendered', () => {
  assert.match(shader, /float radius = mix\(0\.20, 0\.46, amount\);/)
  assert.match(shader, /float halfSize = mix\(0\.20, 0\.46, amount\);/)
  assert.doesNotMatch(shader, /\* step\(0\.02, amount\);/)
})

test('corrects the tall text cells when rendering circles and squares', () => {
  assert.match(shader, /uniform float uRows;/)
  assert.match(shader, /uniform float uShapeYScale;/)
  assert.match(shader, /float rows = max\(1\.0, uRows\);/)
  assert.match(shader, /vec2 centered = \(local - vec2\(0\.5\)\) \* vec2\(1\.0, uShapeYScale\);/)
  assert.match(canvas, /resolveMosaicGrid\(current\.tiles, canvas\.width, canvas\.height\)/)
  assert.match(canvas, /getUniformLocation\(program, 'uRows'\)/)
  assert.match(canvas, /getUniformLocation\(program, 'uShapeYScale'\)/)
})

test('shows source-video information only inside mosaic marks', () => {
  assert.match(shader, /vec3 outputColor = mix\(uBackgroundColor, roleColor, glyph\);/)
  assert.doesNotMatch(shader, /float paperLuma = luminance\(texture2D\(uVideo, shiftedUv\)\.rgb\);/)
  assert.doesNotMatch(shader, /float fineGrain =/)
  assert.doesNotMatch(shader, /vec3 paperColor =/)
})

test('keeps the established M O E atlas path as shape mode zero', () => {
  assert.match(shader, /float atlasGlyph = atlasLetter\(tileLocal, inkLuma\);/)
  assert.match(shader, /glyph = mix\(glyph, atlasGlyph, uUseGlyphAtlas\) \* insideTile;/)
  assert.ok(
    shader.indexOf('glyph = mix(glyph, atlasGlyph, uUseGlyphAtlas) * insideTile;')
      < shader.indexOf('if (uShapeMode > 0.5 && uShapeMode < 1.5)')
  )
})
