import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const shaderSource = await readFile(
  new URL('../lib/pixel-shaders.ts', import.meta.url),
  'utf8'
)

test('ports the TouchDesigner long vertical pigment accumulation', () => {
  assert.match(shaderSource, /for \(int i = -6; i <= 6; i\+\+\)/)
  assert.match(shaderSource, /exp\(-fi \* fi \* 0\.11\)/)
  assert.match(shaderSource, /9\.0 \+ uVerticalSmear \* 180\.0 \+ kick \* 18\.0/)
})

test('ports TouchDesigner full-color pigment accumulation and decay', () => {
  assert.match(shaderSource, /vec3 screenBlend\(vec3 base, vec3 layer\)/)
  assert.match(shaderSource, /1\.0 - \(1\.0 - base\) \* \(1\.0 - layer\)/)
  assert.match(shaderSource, /vec4 sampleAdvectedPigment\(/)
  assert.match(shaderSource, /vec4 history = vec4\(0\.0\)/)
  assert.match(shaderSource, /history \+= texture2D\(uFeedback,/)
  assert.doesNotMatch(shaderSource, /texture2D\(uFeedback,[^;]+\)\.a/)
})

test('uses the full TouchDesigner pigment palette in one frame', () => {
  assert.match(shaderSource, /vec3 ink = vec3\(0\.120, 0\.145, 0\.150\)/)
  assert.match(shaderSource, /vec3 rust = vec3\(0\.650, 0\.420, 0\.300\)/)
  assert.match(shaderSource, /vec3 sage = vec3\(0\.560, 0\.640, 0\.580\)/)
  assert.match(shaderSource, /vec3 dustyBlue = vec3\(0\.620, 0\.740, 0\.820\)/)
  assert.match(shaderSource, /vec3 ivory = vec3\(0\.925, 0\.918, 0\.885\)/)
  assert.match(shaderSource, /vec3 pearl = vec3\(0\.970, 0\.965, 0\.940\)/)
})

test('adds fine vertical fibers and animated grain without a mosaic grid', () => {
  assert.match(
    shaderSource,
    /float wovenPigmentFiber\(vec2 materialUv, float curtain\)/
  )
  assert.match(shaderSource, /vec2 grainUv = floor\(historyUv \* uResolution\)/)
  assert.match(
    shaderSource,
    /hash\(grainUv \+ vec2\(uTime \* 53\.0, uTime \* 31\.0\)\)/
  )
  assert.doesNotMatch(shaderSource, /fract\(vUv \*.*grid/i)
  assert.doesNotMatch(shaderSource, /glyph/i)
})

test('transports the source and pigment history instead of drawing contour lines', () => {
  assert.match(
    shaderSource,
    /float advectedSourceField\(/
  )
  assert.match(shaderSource, /vec4 sampleAdvectedPigment\(/)
  assert.doesNotMatch(shaderSource, /\+ edge \* 0\.10/)
  assert.doesNotMatch(shaderSource, /color \+= edge/)
  assert.doesNotMatch(shaderSource, /source \* 0\.09/)
})

test('uses low-frequency domain warping and restrained surface fibers', () => {
  assert.match(shaderSource, /vec4 liquidFoldField\(vec2 uv, float kick\)/)
  assert.match(shaderSource, /float broadA = fbm/)
  assert.match(shaderSource, /float narrow = fbm/)
  assert.match(shaderSource, /fiber - 0\.5\) \* \(0\.045 \+ kick \* 0\.010\)/)
})

test('deforms source luminance with no direct RGB reveal', () => {
  assert.match(
    shaderSource,
    /float advectedSourceField\(/
  )
  assert.match(shaderSource, /texel\.x \* 12\.0/)
  assert.match(shaderSource, /texel\.y \* 38\.0/)
  assert.match(shaderSource, /sourceUv = advectUv\(materialUv, velocity, sourceDistance\)/)
  assert.doesNotMatch(shaderSource, /color = mix\(color, source,/)
  assert.doesNotMatch(shaderSource, /sourceRecognizability/)
})

test('restores only a medium-scale silhouette inside the liquid field', () => {
  assert.match(
    shaderSource,
    /float advectedSilhouetteField\(vec2 sourceUv, vec2 texel, vec2 velocity\)/
  )
  assert.match(shaderSource, /texel\.x \* 8\.0/)
  assert.match(shaderSource, /texel\.y \* 20\.0/)
  assert.match(shaderSource, /mix\(sourceSoft, silhouetteSoft, 0\.18\)/)
  assert.match(shaderSource, /mix\(liquidMemory, silhouetteSoft, 0\.18\)/)
  assert.doesNotMatch(shaderSource, /color = mix\(color, source,/)
})

test('uses vertically stretched pigment fibers plus restrained animated grain', () => {
  assert.match(
    shaderSource,
    /float wovenPigmentFiber\(vec2 materialUv, float curtain\)/
  )
  assert.match(shaderSource, /vec2\(260\.0, 5\.5\)/)
  assert.match(
    shaderSource,
    /grain - 0\.5\) \* \(0\.007 \+ kick \* 0\.003\)/
  )
  assert.doesNotMatch(shaderSource, /scanline/i)
})

test('advects the current video and feedback through one liquid velocity field', () => {
  assert.match(shaderSource, /vec2 curvedLiquidVelocity\(/)
  assert.match(
    shaderSource,
    /vec2 advectUv\(vec2 uv, vec2 velocity, float distance\)/
  )
  assert.match(
    shaderSource,
    /vec2 sourceUv = advectUv\(materialUv, velocity, sourceDistance\)/
  )
  assert.match(
    shaderSource,
    /vec2 historyUv = advectUv\(materialUv, velocity, historyDistance\)/
  )
  assert.match(
    shaderSource,
    /advectedSourceField\(sourceUv, texel, velocity, kick\)/
  )
  assert.match(
    shaderSource,
    /sampleAdvectedPigment\(historyUv, texel, velocity, kick\)/
  )
})

test('uses transported RGB pigment as the visible material instead of recoloring alpha', () => {
  assert.match(shaderSource, /vec4 historySample = sampleAdvectedPigment\(/)
  assert.match(shaderSource, /vec3 transportedPigment =/)
  assert.match(shaderSource, /vec3 injectionColor = pigmentInjectionColor\(/)
  assert.match(shaderSource, /mix\(\s*transportedPigment,\s*injectionColor,/)
  assert.doesNotMatch(shaderSource, /vec3 decayedHistory = vec3\(history/)
})

test('embeds silhouettes and fibers in advected coordinates', () => {
  assert.match(
    shaderSource,
    /advectedSilhouetteField\(sourceUv, texel, velocity\)/
  )
  assert.match(shaderSource, /wovenPigmentFiber\(historyUv, curtain\)/)
  assert.doesNotMatch(shaderSource, /wovenPigmentFiber\(vUv,/)
  assert.doesNotMatch(shaderSource, /liquidSourceField\(vUv,/)
})

test('biases liquid transport into broad folds with a vertical pigment drift', () => {
  assert.match(
    shaderSource,
    /vec4 liquidFoldField\(vec2 uv, float kick\)/
  )
  assert.match(shaderSource, /vec2 curvedLiquidVelocity\(/)
  assert.match(shaderSource, /float columnDrift =/)
  assert.match(shaderSource, /vec2 liquidMaterialCoordinates\(/)
  assert.doesNotMatch(shaderSource, /return normalize\(curl \+ drift/)
})

test('keeps transported history translucent instead of accumulating black pools', () => {
  assert.match(shaderSource, /float translucentHistory\(float history, float curtain\)/)
  assert.match(shaderSource, /mix\(0\.58 \+ curtain \* 0\.12, 0\.96, history\)/)
  assert.match(shaderSource, /vec3 ivory = vec3\(0\.925, 0\.918, 0\.885\)/)
  assert.match(shaderSource, /vec3 paleGray = vec3\(0\.810, 0\.825, 0\.815\)/)
  assert.doesNotMatch(shaderSource, /vec3 color = mix\(ink, middle/)
})

test('warps source history and woven fibers through the same liquid coordinates', () => {
  assert.match(shaderSource, /vec2 materialUv = liquidMaterialCoordinates\(/)
  assert.match(shaderSource, /sourceUv = advectUv\(materialUv, velocity, sourceDistance\)/)
  assert.match(shaderSource, /historyUv = advectUv\(materialUv, velocity, historyDistance\)/)
  assert.match(shaderSource, /float wovenPigmentFiber\(vec2 materialUv, float curtain\)/)
  assert.match(shaderSource, /wovenPigmentFiber\(historyUv, curtain\)/)
})

test('keeps visible warm cool and woven variation inside the pale membrane', () => {
  assert.match(shaderSource, /vec3 warmBeige = vec3\(0\.865, 0\.825, 0\.745\)/)
  assert.match(shaderSource, /float paletteDrift =/)
  assert.match(shaderSource, /float fiberContrast = \(fiber - 0\.5\) \* 2\.0/)
  assert.match(shaderSource, /abs\(fiberContrast\)/)
  assert.match(shaderSource, /color = mix\(color, warmBeige, warmVeil\)/)
  assert.match(shaderSource, /blueVeil \* \(0\.28 \+ shadowResidual \* 0\.16\)/)
  assert.match(shaderSource, /abs\(fiberContrast\)\) \* 0\.15/)
})

test('restores broad liquid folds that deform every material input', () => {
  assert.match(shaderSource, /vec4 liquidFoldField\(vec2 uv, float kick\)/)
  assert.match(shaderSource, /vec2 curvedLiquidVelocity\(/)
  assert.match(shaderSource, /uniform float uFoldDisplacement/)
  assert.match(shaderSource, /uniform float uFoldVelocity/)
  assert.match(shaderSource, /fold\.xy \* uFoldDisplacement/)
  assert.match(shaderSource, /vec2 materialUv = liquidMaterialCoordinates\(/)
  assert.match(shaderSource, /advectedSilhouetteField\(sourceUv, texel, velocity\)/)
  assert.match(shaderSource, /wovenPigmentFiber\(historyUv, curtain\)/)
})

test('fans pigment history across each curved liquid fold', () => {
  assert.match(shaderSource, /uniform float uTangentFan/)
  assert.match(shaderSource, /vec2 flowAxis = normalize\(velocity\)/)
  assert.match(shaderSource, /vec2 tangentAxis = vec2\(-flowAxis\.y, flowAxis\.x\)/)
  assert.match(shaderSource, /float fan = abs\(fi\) \* uTangentFan/)
  assert.match(shaderSource, /offset \+= tangentAxis \* fan \* texel \* spread/)
  assert.doesNotMatch(shaderSource, /vec2 verticalAxis = normalize/)
})
