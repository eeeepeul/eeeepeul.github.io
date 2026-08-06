import { LETTER_THRESHOLDS } from './letter-mosaic.mjs'
import { resolveGlyphUvRange } from './glyph-atlas.mjs'

const E_TO_O = LETTER_THRESHOLDS[0].toFixed(2)
const O_TO_M = LETTER_THRESHOLDS[1].toFixed(2)
const GLYPH_UV_RANGE = resolveGlyphUvRange()
const GLYPH_UV_MINIMUM = GLYPH_UV_RANGE.minimum.toFixed(5)
const GLYPH_UV_MAXIMUM = GLYPH_UV_RANGE.maximum.toFixed(5)

export const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, aPosition.y * 0.5 + 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

export const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D uVideo;
uniform sampler2D uGlyphAtlas;
uniform vec2 uResolution;
uniform float uColumns;
uniform float uRows;
uniform float uGlitch;
uniform float uTime;
uniform float uSpacing;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uHue;
uniform float uSharpness;
uniform float uGamma;
uniform float uColorMode;
uniform float uIntensity;
uniform float uUseGlyphAtlas;
uniform float uGlyphCount;
uniform float uGlyphAtlasColumns;
uniform float uShapeMode;
uniform float uShapeYScale;
uniform vec3 uBackgroundColor;
uniform vec3 uDiagonalColor;
uniform vec3 uCircleColor;
uniform vec3 uSolidColor;
uniform vec3 uGlyphColor;
varying vec2 vUv;

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float noise(vec2 point) {
  return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 rotateHue(vec3 color, float angle) {
  float y = dot(color, vec3(0.299, 0.587, 0.114));
  float i = dot(color, vec3(0.596, -0.274, -0.322));
  float q = dot(color, vec3(0.211, -0.523, 0.312));
  float chroma = sqrt(i * i + q * q);
  float hue = atan(q, i) + angle;
  i = chroma * cos(hue);
  q = chroma * sin(hue);
  return vec3(
    y + 0.956 * i + 0.621 * q,
    y - 0.272 * i - 0.647 * q,
    y - 1.106 * i + 1.703 * q
  );
}

vec3 adjustedVideoColor(vec2 sampleUv, vec2 grid) {
  vec3 center = texture2D(uVideo, sampleUv).rgb;
  vec2 cellStep = 1.0 / grid;
  vec3 neighbors = (
    texture2D(uVideo, clamp(sampleUv + vec2(cellStep.x, 0.0), vec2(0.0), vec2(1.0))).rgb
    + texture2D(uVideo, clamp(sampleUv - vec2(cellStep.x, 0.0), vec2(0.0), vec2(1.0))).rgb
    + texture2D(uVideo, clamp(sampleUv + vec2(0.0, cellStep.y), vec2(0.0), vec2(1.0))).rgb
    + texture2D(uVideo, clamp(sampleUv - vec2(0.0, cellStep.y), vec2(0.0), vec2(1.0))).rgb
  ) * 0.25;
  vec3 color = center + (center - neighbors) * uSharpness * 2.0;
  color += vec3(uBrightness);
  color = (color - 0.5) * (1.0 + uContrast) + 0.5;
  float gray = luminance(color);
  color = mix(vec3(gray), color, 1.0 + uSaturation);
  color = rotateHue(color, uHue);
  return pow(clamp(color, 0.0, 1.0), vec3(1.0 / max(0.1, uGamma)));
}

float equalCell(float value, float target) {
  return 1.0 - step(0.25, abs(value - target));
}

vec3 glyphCell(vec2 local) {
  vec2 glyphUv = (local - vec2(0.16, 0.12)) / vec2(0.68, 0.76);
  float inside = step(0.0, glyphUv.x) * step(glyphUv.x, 1.0)
    * step(0.0, glyphUv.y) * step(glyphUv.y, 1.0);
  float column = floor(clamp(glyphUv.x, 0.0, 0.999) * 5.0);
  float row = floor(clamp(1.0 - glyphUv.y, 0.0, 0.999) * 7.0);
  return vec3(column, row, inside);
}

float letterM(vec2 local) {
  vec3 cell = glyphCell(local);
  float verticals = max(equalCell(cell.x, 0.0), equalCell(cell.x, 4.0));
  float upperPair = equalCell(cell.y, 1.0)
    * max(equalCell(cell.x, 1.0), equalCell(cell.x, 3.0));
  float center = equalCell(cell.y, 2.0) * equalCell(cell.x, 2.0);
  return cell.z * max(verticals, max(upperPair, center));
}

float letterO(vec2 local) {
  vec3 cell = glyphCell(local);
  float horizontal = max(equalCell(cell.y, 0.0), equalCell(cell.y, 6.0))
    * step(0.75, cell.x) * step(cell.x, 3.25);
  float vertical = max(equalCell(cell.x, 0.0), equalCell(cell.x, 4.0))
    * step(0.75, cell.y) * step(cell.y, 5.25);
  return cell.z * max(horizontal, vertical);
}

float letterE(vec2 local) {
  vec3 cell = glyphCell(local);
  float vertical = equalCell(cell.x, 0.0);
  float topBottom = max(equalCell(cell.y, 0.0), equalCell(cell.y, 6.0));
  float middle = equalCell(cell.y, 3.0) * step(cell.x, 3.25);
  return cell.z * max(vertical, max(topBottom, middle));
}

float atlasLetter(vec2 local, float luma) {
  float inside = step(0.0, local.x) * step(local.x, 1.0)
    * step(0.0, local.y) * step(local.y, 1.0);
  float glyphCount = max(1.0, uGlyphCount);
  float atlasColumns = max(glyphCount, uGlyphAtlasColumns);
  float normalizedLuma = clamp(luma, 0.0, 0.9999);
  float glyphIndex = floor(normalizedLuma * glyphCount);
  vec2 atlasLocal = mix(
    vec2(${GLYPH_UV_MINIMUM}),
    vec2(${GLYPH_UV_MAXIMUM}),
    clamp(local, vec2(0.0), vec2(1.0))
  );
  vec2 atlasUv = vec2((glyphIndex + atlasLocal.x) / atlasColumns, atlasLocal.y);
  return texture2D(uGlyphAtlas, atlasUv).r * inside;
}

float circleMask(vec2 local, float luma) {
  float amount = smoothstep(0.06, 0.92, luma);
  float radius = mix(0.20, 0.46, amount);
  vec2 centered = (local - vec2(0.5)) * vec2(1.0, uShapeYScale);
  float distanceFromCenter = length(centered);
  return 1.0 - smoothstep(radius - 0.025, radius, distanceFromCenter);
}

float squareMask(vec2 local, float luma) {
  float amount = smoothstep(0.06, 0.92, luma);
  float halfSize = mix(0.20, 0.46, amount);
  vec2 centered = abs((local - vec2(0.5)) * vec2(1.0, uShapeYScale));
  float distanceFromCenter = max(centered.x, centered.y);
  return 1.0 - smoothstep(halfSize - 0.025, halfSize, distanceFromCenter);
}

void main() {
  float rows = max(1.0, uRows);
  vec2 grid = vec2(uColumns, rows);
  float timeStep = floor(uTime * 18.0);
  float rowBand = floor(vUv.y * 24.0);
  float activeBand = step(0.72, noise(vec2(rowBand, timeStep)));
  float horizontalShift = (noise(vec2(rowBand, timeStep + 17.0)) - 0.5)
    * 0.11 * uGlitch * activeBand;
  vec2 shiftedUv = vec2(clamp(vUv.x + horizontalShift, 0.0, 1.0), vUv.y);
  vec2 cell = floor(shiftedUv * grid);
  vec2 local = fract(shiftedUv * grid);
  vec2 sampleUv = (cell + 0.5) / grid;
  vec3 sampledColor = adjustedVideoColor(sampleUv, grid);
  float luma = luminance(sampledColor);
  float inkLuma = clamp(luma + (noise(cell + vec2(19.0, 43.0)) - 0.5) * 0.12, 0.0, 1.0);
  float tileInset = clamp(uSpacing, 0.0, 1.0) * 0.45;
  float tileSize = max(0.1, 1.0 - tileInset * 2.0);
  vec2 tileLocal = (local - tileInset) / tileSize;
  float insideTile = step(tileInset, local.x) * step(local.x, 1.0 - tileInset)
    * step(tileInset, local.y) * step(local.y, 1.0 - tileInset);
  float glyph = 0.0;
  vec3 roleColor = uDiagonalColor;

  glyph = letterE(tileLocal);
  if (inkLuma >= ${E_TO_O}) {
    glyph = letterO(tileLocal);
    roleColor = uCircleColor;
  }
  if (inkLuma >= ${O_TO_M}) {
    glyph = letterM(tileLocal);
    roleColor = uSolidColor;
  }

  float atlasGlyph = atlasLetter(tileLocal, inkLuma);
  glyph = mix(glyph, atlasGlyph, uUseGlyphAtlas) * insideTile;
  if (uShapeMode > 0.5 && uShapeMode < 1.5) {
    glyph = circleMask(tileLocal, inkLuma) * insideTile;
  }
  if (uShapeMode >= 1.5) {
    glyph = squareMask(tileLocal, inkLuma) * insideTile;
  }
  if (uColorMode > 0.5) roleColor = vec3(luminance(roleColor));
  roleColor = clamp(uBackgroundColor + (roleColor - uBackgroundColor) * uIntensity, 0.0, 1.0);
  vec3 outputColor = mix(uBackgroundColor, roleColor, glyph);
  gl_FragColor = vec4(outputColor, 1.0);
}
`

export const EXPORT_WIDTH = 1920
export const EXPORT_HEIGHT = 1080
