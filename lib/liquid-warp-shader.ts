// A color-preserving liquid distortion pass for the CCTV source video.
// The controls only move the source sampling coordinates; they never remap RGB
// values through a palette or solarize curve.
export const LIQUID_WARP_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D uVideo;
uniform vec2 uResolution;
uniform float uTime;
uniform float uFlowFrequency;
uniform float uWarpStrength;
uniform float uFoldDisplacement;
uniform float uFoldVelocity;
uniform float uTangentFan;
uniform float uVerticalSmear;
uniform float uKick;
varying vec2 vUv;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 point) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 3; octave += 1) {
    total += valueNoise(point) * amplitude;
    point = point * 2.03 + vec2(13.2, 7.7);
    amplitude *= 0.5;
  }
  return total;
}

void main() {
  float frequency = max(1.0, uFlowFrequency);
  float activeWarp = max(0.0, uWarpStrength - 0.002)
    + max(0.0, uFoldDisplacement - 0.010);
  float activeSpacing = max(0.0, uTangentFan - 0.08)
    + max(0.0, uVerticalSmear - 0.014);
  float controlGate = step(0.000001, activeWarp + activeSpacing);
  if (controlGate < 0.5) {
    gl_FragColor = texture2D(uVideo, vUv);
    return;
  }
  float warpAmplitude = clamp(
    activeWarp * 3.5
      + activeSpacing * 0.45
      + uKick * 0.012 * controlGate,
    0.0,
    0.16
  );
  float phase = uTime * (0.18 + uFoldVelocity * 0.22);
  vec2 fieldUv = vUv * vec2(2.0 + frequency * 0.42, 1.5 + frequency * 0.18);
  float field = fbm(fieldUv + vec2(phase * 0.40, -phase * 0.25));
  float broadWave = sin(
    vUv.y * (5.0 + frequency * 0.72) + field * 5.6 + phase
  );
  float fineWave = sin(
    vUv.y * (18.0 + frequency * 1.45) - field * 4.2 - phase * 0.72
  );
  float fanWave = sin(
    vUv.x * (4.0 + frequency * 0.38) + field * 3.2 + phase * 0.64
  );
  float verticalWave = sin(
    vUv.x * (7.0 + frequency * 0.40) - phase * 0.48
  );

  vec2 displacement = vec2(
    (broadWave * 0.68 + fineWave * 0.22 + (field - 0.5) * 0.78)
      * warpAmplitude,
    (fanWave * 0.35 + verticalWave * 0.18)
      * warpAmplitude * (0.55 + activeSpacing * 1.4)
      + (field - 0.5) * max(0.0, uVerticalSmear - 0.014) * 0.18
        * controlGate
  );
  vec2 warpedUv = clamp(vUv + displacement, vec2(0.001), vec2(0.999));

  // This is intentionally the only visible color source: the original video.
  gl_FragColor = texture2D(uVideo, warpedUv);
}
`
