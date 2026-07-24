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

void main() {
  float rows = max(1.0, floor(uColumns * uResolution.y / uResolution.x));
  vec2 grid = vec2(uColumns, rows);
  vec2 cell = floor(vUv * grid);
  vec2 local = fract(vUv * grid);
  vec2 sampleUv = (cell + 0.5) / grid;
  float luma = luminance(texture2D(uVideo, sampleUv).rgb);

  float border = step(0.045, local.x) * step(0.045, local.y)
    * step(local.x, 0.955) * step(local.y, 0.955);
  float diagonal = step(0.50, fract((local.x + local.y) * 3.0));
  float radius = distance(local, vec2(0.5));
  float ring = step(0.22, radius) * (1.0 - step(0.38, radius));

  vec3 outputColor = uBackgroundColor;
  if (luma >= 0.22 && luma < 0.46) {
    outputColor = mix(uBackgroundColor, uDiagonalColor, diagonal * border);
  }
  if (luma >= 0.46 && luma < 0.72) {
    outputColor = mix(uBackgroundColor, uCircleColor, ring * border);
  }
  if (luma >= 0.72) {
    outputColor = mix(uBackgroundColor, uSolidColor, border);
  }
  gl_FragColor = vec4(outputColor, 1.0);
}
`

export const EXPORT_WIDTH = 1920
export const EXPORT_HEIGHT = 1080
