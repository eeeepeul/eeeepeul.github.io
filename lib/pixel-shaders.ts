import { LETTER_THRESHOLDS } from './letter-mosaic.mjs'

const DARK_TO_MIDDLE = LETTER_THRESHOLDS[0].toFixed(2)
const MIDDLE_TO_BRIGHT = LETTER_THRESHOLDS[1].toFixed(2)

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
uniform vec2 uResolution;
uniform float uColumns;
uniform vec3 uBackgroundColor;
uniform vec3 uDiagonalColor;
uniform vec3 uCircleColor;
uniform vec3 uSolidColor;
varying vec2 vUv;

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
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

void main() {
  float rows = max(1.0, floor(uColumns * uResolution.y / uResolution.x));
  vec2 grid = vec2(uColumns, rows);
  vec2 cell = floor(vUv * grid);
  vec2 local = fract(vUv * grid);
  vec2 sampleUv = (cell + 0.5) / grid;
  vec3 sampledColor = texture2D(uVideo, sampleUv).rgb;
  float luma = luminance(sampledColor);
  float glyph = letterE(local);
  vec3 roleColor = uDiagonalColor;

  if (luma >= ${DARK_TO_MIDDLE}) {
    glyph = letterO(local);
    roleColor = uCircleColor;
  }
  if (luma >= ${MIDDLE_TO_BRIGHT}) {
    glyph = letterM(local);
    roleColor = uSolidColor;
  }

  float colorVariation = 0.76 + luma * 0.32;
  vec3 glyphColor = clamp(roleColor * colorVariation, 0.0, 1.0);
  vec3 outputColor = mix(uBackgroundColor, glyphColor, glyph);
  gl_FragColor = vec4(outputColor, 1.0);
}
`

export const EXPORT_WIDTH = 1920
export const EXPORT_HEIGHT = 1080
