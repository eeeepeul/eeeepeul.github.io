// WebGL port of the TouchDesigner solarize-silhouette treatment used by the CCTV view.
export const SOLARIZE_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D uVideo;
uniform sampler2D uFeedback;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSolarizeStrength;
uniform float uKick;
uniform vec3 uBackgroundColor;
uniform vec3 uDarkColor;
uniform vec3 uMidColor;
uniform vec3 uLightColor;
varying vec2 vUv;

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 paletteMap(float tone, float grain) {
  vec3 shadow = mix(uDarkColor, uMidColor, smoothstep(0.05, 0.48, tone));
  vec3 highlight = mix(uMidColor, uLightColor, smoothstep(0.48, 0.96, tone));
  vec3 mapped = mix(shadow, highlight, smoothstep(0.34, 0.68, tone));
  vec3 alternate = mix(uBackgroundColor, uMidColor, 0.58 + grain * 0.22);
  return mix(mapped, alternate, smoothstep(0.18, 0.82, grain) * 0.42);
}

void main() {
  vec2 pixel = 1.0 / max(uResolution, vec2(1.0));
  float strength = clamp(uSolarizeStrength + uKick * 0.035, 0.0, 1.0);
  float repetitions = mix(1.25, 3.8, strength);
  float detailThreshold = mix(0.19, 0.055, strength);

  vec3 source = texture2D(uVideo, vUv).rgb;
  float center = luminance(source);
  float left = luminance(texture2D(uVideo, vUv - vec2(pixel.x * 1.5, 0.0)).rgb);
  float right = luminance(texture2D(uVideo, vUv + vec2(pixel.x * 1.5, 0.0)).rgb);
  float above = luminance(texture2D(uVideo, vUv + vec2(0.0, pixel.y * 1.5)).rgb);
  float below = luminance(texture2D(uVideo, vUv - vec2(0.0, pixel.y * 1.5)).rgb);

  float localAverage = (center * 4.0 + left + right + above + below) / 8.0;
  float exposed = clamp((localAverage - 0.5) * mix(1.45, 2.7, strength) + 0.5, 0.0, 1.0);
  float solarized = 1.0 - abs(2.0 * fract(exposed * repetitions) - 1.0);
  float edge = clamp(abs(right - left) + abs(above - below), 0.0, 1.0);

  vec2 grainCell = floor(vUv * uResolution * mix(0.28, 0.78, strength));
  float grainA = hash(grainCell + floor(uTime * 8.0));
  float grainB = hash(grainCell * 0.73 + vec2(31.0, 79.0) + floor(uTime * 5.0));
  float chromaNoise = (grainA - grainB) * mix(0.08, 0.28, strength);

  float clipped = smoothstep(detailThreshold, detailThreshold + 0.13, solarized + edge * 0.52);
  float silhouette = smoothstep(0.54 - strength * 0.11, 0.72 - strength * 0.08, exposed + clipped * 0.22);
  float tone = clamp(solarized * 0.54 + exposed * 0.28 + edge * 0.55 + chromaNoise, 0.0, 1.0);
  vec3 paletteColor = paletteMap(tone, grainA);
  vec3 paleSilhouette = mix(uLightColor, uBackgroundColor, 0.18 + grainB * 0.08);
  vec3 color = mix(paletteColor, paleSilhouette, silhouette);

  color += (grainA - 0.5) * mix(0.025, 0.12, strength);
  color = mix(color, paletteMap(clamp(tone + chromaNoise, 0.0, 1.0), grainB), 0.22);
  vec2 feedbackOffset = vec2(chromaNoise, grainA - 0.5) * pixel * mix(0.8, 3.2, strength);
  vec3 previous = texture2D(uFeedback, clamp(vUv + feedbackOffset, 0.0, 1.0)).rgb;
  float feedbackRetention = mix(0.10, 0.38, strength) * step(0.012, luminance(previous));
  color = mix(color, previous, feedbackRetention);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`
