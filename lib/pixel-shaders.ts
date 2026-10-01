export const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, aPosition.y * 0.5 + 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

export const FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D uVideo;
uniform sampler2D uFeedback;
uniform vec2 uResolution;
uniform float uTime;
uniform float uFlowFrequency;
uniform float uWarpStrength;
uniform float uFoldDisplacement;
uniform float uFoldVelocity;
uniform float uTangentFan;
uniform float uVerticalSmear;
uniform float uFeedbackRetention;
uniform float uHistoryColorRetention;
uniform float uShadowMassStrength;
uniform float uSourceMix;
uniform float uBloom;
uniform float uKick;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uHue;
uniform float uSharpness;
uniform float uGamma;
uniform float uColorMode;
uniform float uIntensity;
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
  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
  for (int octave = 0; octave < 4; octave += 1) {
    total += valueNoise(point) * amplitude;
    point = rotation * point * 2.03 + vec2(13.2, 7.7);
    amplitude *= 0.5;
  }
  return total;
}

float pigmentCurtain(vec2 uv) {
  float broad = fbm(vec2(
    uv.x * max(1.8, uFlowFrequency * 0.24) + uTime * 0.018,
    uv.y * 0.58 - uTime * 0.010
  ));
  float columns = valueNoise(vec2(
    uv.x * max(7.0, uFlowFrequency * 0.92) - uTime * 0.022,
    uv.y * 1.35 + uTime * 0.015
  ));
  return clamp(broad * 0.72 + columns * 0.28, 0.0, 1.0);
}

vec4 liquidFoldField(vec2 uv, float kick) {
  float foldTime = uTime * uFoldVelocity * (1.0 + kick * 0.18);
  vec2 broadUv = uv * vec2(
    max(1.45, uFlowFrequency * 0.18),
    max(0.85, uFlowFrequency * 0.09)
  );
  float broadA = fbm(
    broadUv + vec2(foldTime * 0.12, -foldTime * 0.09)
  );
  float broadB = fbm(
    broadUv.yx * vec2(0.82, 1.16)
      + vec2(17.3, -9.1)
      + vec2(-foldTime * 0.08, foldTime * 0.11)
  );
  vec2 narrowUv = uv * vec2(
    max(3.4, uFlowFrequency * 0.44),
    max(2.2, uFlowFrequency * 0.25)
  );
  float narrow = fbm(
    narrowUv
      + vec2(broadA * 2.6, broadB * 2.4)
      + vec2(foldTime * 0.18, -foldTime * 0.14)
  );
  vec2 displacement = vec2(
    (broadA - 0.5) * 0.62 + (narrow - 0.5) * 0.16,
    (broadB - 0.5) * 0.20 - (narrow - 0.5) * 0.08
  );
  return vec4(displacement * (1.0 + kick * 0.06), broadA, narrow);
}

vec2 curvedLiquidVelocity(vec2 uv, float kick, vec4 fold) {
  float slowColumn = valueNoise(vec2(uv.x * 6.5, uTime * 0.025));
  float columnDrift = 0.38
    + slowColumn * 0.30
    + uFoldVelocity * 0.18
    + kick * 0.42;
  vec2 curvature = vec2(
    fold.x * 0.34 + (fold.w - 0.5) * 0.10,
    fold.y * 0.10 - (fold.w - 0.5) * 0.05
  );
  return vec2(curvature.x * 0.24, columnDrift + curvature.y * 0.12);
}

vec2 liquidMaterialCoordinates(vec2 uv, vec4 fold, vec2 velocity) {
  vec2 foldWarp = fold.xy * uFoldDisplacement;
  return clamp(
    uv + foldWarp + velocity * uWarpStrength * vec2(0.28, 0.12),
    vec2(0.001),
    vec2(0.999)
  );
}

vec2 advectUv(vec2 uv, vec2 velocity, float distance) {
  return clamp(uv - velocity * distance, vec2(0.001), vec2(0.999));
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

vec3 adjustedVideoColor(vec2 sampleUv) {
  vec2 pixel = 1.0 / max(uResolution, vec2(1.0));
  vec3 center = texture2D(uVideo, sampleUv).rgb;
  vec3 neighbors = (
    texture2D(uVideo, clamp(sampleUv + vec2(pixel.x * 2.0, 0.0), 0.0, 1.0)).rgb
    + texture2D(uVideo, clamp(sampleUv - vec2(pixel.x * 2.0, 0.0), 0.0, 1.0)).rgb
    + texture2D(uVideo, clamp(sampleUv + vec2(0.0, pixel.y * 2.0), 0.0, 1.0)).rgb
    + texture2D(uVideo, clamp(sampleUv - vec2(0.0, pixel.y * 2.0), 0.0, 1.0)).rgb
  ) * 0.25;
  vec3 color = center + (center - neighbors) * uSharpness * 1.4;
  color += vec3(uBrightness);
  color = (color - 0.5) * (1.0 + uContrast) + 0.5;
  float gray = luminance(color);
  color = mix(vec3(gray), color, 1.0 + uSaturation);
  color = rotateHue(color, uHue);
  return pow(clamp(color, 0.0, 1.0), vec3(1.0 / max(0.1, uGamma)));
}

vec3 screenBlend(vec3 base, vec3 layer) {
  return 1.0 - (1.0 - base) * (1.0 - layer);
}

float sourceTone(vec2 uv) {
  float tone = luminance(texture2D(uVideo, clamp(uv, 0.001, 0.999)).rgb);
  tone += uBrightness;
  tone = (tone - 0.5) * (1.0 + uContrast * 0.72) + 0.5;
  return pow(clamp(tone, 0.0, 1.0), 1.0 / max(0.1, uGamma));
}

float advectedSourceField(
  vec2 sourceUv,
  vec2 texel,
  vec2 velocity,
  float kick
) {
  vec2 tangent = vec2(-velocity.y, velocity.x);
  vec2 along = velocity * vec2(texel.x * 12.0, texel.y * 38.0)
    * (1.0 + kick * 0.28);
  vec2 across = tangent * vec2(texel.x * 5.0, texel.y * 7.0);
  float tone = sourceTone(sourceUv) * 0.32;
  tone += sourceTone(sourceUv + along) * 0.21;
  tone += sourceTone(sourceUv - along) * 0.21;
  tone += sourceTone(sourceUv + along * 1.8) * 0.08;
  tone += sourceTone(sourceUv - along * 1.8) * 0.08;
  tone += sourceTone(sourceUv + across) * 0.05;
  tone += sourceTone(sourceUv - across) * 0.05;
  return smoothstep(0.06, 0.94, tone);
}

float advectedSilhouetteField(vec2 sourceUv, vec2 texel, vec2 velocity) {
  vec2 tangent = vec2(-velocity.y, velocity.x);
  vec2 along = velocity * vec2(texel.x * 8.0, texel.y * 20.0);
  vec2 across = tangent * vec2(texel.x * 4.0, texel.y * 6.0);
  float tone = sourceTone(sourceUv) * 0.40;
  tone += sourceTone(sourceUv + along) * 0.18;
  tone += sourceTone(sourceUv - along) * 0.18;
  tone += sourceTone(sourceUv + across) * 0.12;
  tone += sourceTone(sourceUv - across) * 0.12;
  return smoothstep(0.10, 0.90, tone);
}

float wovenPigmentFiber(vec2 materialUv, float curtain) {
  vec2 longFiberUv = materialUv * vec2(260.0, 5.5);
  longFiberUv += vec2(curtain * 18.0 + uTime * 0.11, -uTime * 0.020);
  float longFiber = valueNoise(longFiberUv);
  float clusteredFiber = valueNoise(
    materialUv * vec2(78.0, 17.0)
      + vec2(curtain * 7.0 - uTime * 0.06, uTime * 0.018)
  );
  float crossFiber = valueNoise(
    materialUv * vec2(22.0, 118.0)
      + vec2(5.0, curtain * 12.0 + uTime * 0.025)
  );
  return clamp(
    longFiber * 0.56 + clusteredFiber * 0.29 + crossFiber * 0.15,
    0.0,
    1.0
  );
}

vec4 sampleAdvectedPigment(
  vec2 historyUv,
  vec2 texel,
  vec2 velocity,
  float kick
) {
  vec4 history = vec4(0.0);
  float totalWeight = 0.0;
  float spread = 9.0 + uVerticalSmear * 180.0 + kick * 18.0;
  vec2 flowAxis = normalize(velocity);
  vec2 tangentAxis = vec2(-flowAxis.y, flowAxis.x);
  for (int i = -6; i <= 6; i++) {
    float fi = float(i);
    float weight = exp(-fi * fi * 0.11);
    float fan = abs(fi) * uTangentFan;
    vec2 offset = flowAxis * fi * texel * spread;
    offset += tangentAxis * fan * texel * spread * sign(fi) * 0.18;
    offset += tangentAxis
      * sin(fi * 0.58 + uTime * uFoldVelocity * 0.19)
      * texel
      * spread
      * (0.025 + kick * 0.012);
    vec2 sampleUv = historyUv + offset;
    history += texture2D(uFeedback, clamp(sampleUv, 0.001, 0.999)) * weight;
    totalWeight += weight;
  }
  return history / max(totalWeight, 0.0001);
}

vec3 pigmentInjectionColor(
  vec2 materialUv,
  float field,
  float curtain,
  float shadowResidual
) {
  vec3 rust = vec3(0.650, 0.420, 0.300);
  vec3 sage = vec3(0.560, 0.640, 0.580);
  vec3 dustyBlue = vec3(0.620, 0.740, 0.820);
  vec3 warmBeige = vec3(0.865, 0.825, 0.745);
  vec3 pearl = vec3(0.970, 0.965, 0.940);
  float columnColor = valueNoise(vec2(
    materialUv.x * 3.6 + uTime * 0.018,
    materialUv.y * 0.24 - uTime * 0.006
  ));
  float warmBand = smoothstep(0.48, 0.82, columnColor + curtain * 0.14);
  float sageBand = smoothstep(0.58, 0.90, 1.0 - field + curtain * 0.20);
  float rustBand = smoothstep(0.86, 0.98, columnColor + shadowResidual * 0.10);
  vec3 pigment = mix(dustyBlue, warmBeige, warmBand * 0.72);
  pigment = mix(pigment, sage, sageBand * 0.24);
  pigment = mix(pigment, rust, rustBand * 0.10);
  return mix(pigment, pearl, 0.16);
}

float translucentHistory(float history, float curtain) {
  return clamp(
    mix(0.58 + curtain * 0.12, 0.96, history),
    0.0,
    1.0
  );
}

void main() {
  vec2 texel = 1.0 / max(uResolution, vec2(1.0));
  float kick = clamp(uKick, 0.0, 1.0);

  // Source, history, and fibers travel through the same broad liquid folds.
  vec4 fold = liquidFoldField(vUv, kick);
  vec2 velocity = curvedLiquidVelocity(vUv, kick, fold);
  vec2 materialUv = liquidMaterialCoordinates(vUv, fold, velocity);
  float curtain = pigmentCurtain(materialUv);
  vec2 domain = materialUv * vec2(
    max(1.8, uFlowFrequency * 0.22),
    max(0.72, uFlowFrequency * 0.065)
  );
  float field = fbm(
    domain * 0.34 + velocity * vec2(0.30, 0.08) + vec2(uTime * 0.006, 0.0)
  );
  float sourceDistance = 0.004 + uWarpStrength * 0.42 + kick * 0.001;
  float historyDistance = 0.006 + uWarpStrength * 0.72 + kick * 0.010;
  vec2 sourceUv = advectUv(materialUv, velocity, sourceDistance);
  vec2 historyUv = advectUv(materialUv, velocity, historyDistance);

  float sourceSoft = advectedSourceField(sourceUv, texel, velocity, kick);
  float silhouetteSoft = advectedSilhouetteField(sourceUv, texel, velocity);
  sourceSoft = mix(sourceSoft, silhouetteSoft, 0.18);
  sourceSoft = smoothstep(0.06, 0.94, sourceSoft);

  // High-key translucent pigment family from the XTAL-PF-018 reference.
  vec3 ink = vec3(0.120, 0.145, 0.150);
  vec3 rust = vec3(0.650, 0.420, 0.300);
  vec3 sage = vec3(0.560, 0.640, 0.580);
  vec3 dustyBlue = vec3(0.620, 0.740, 0.820);
  vec3 ivory = vec3(0.925, 0.918, 0.885);
  vec3 warmBeige = vec3(0.865, 0.825, 0.745);
  vec3 paleGray = vec3(0.810, 0.825, 0.815);
  vec3 pearl = vec3(0.970, 0.965, 0.940);
  vec3 smokyBlueGray = vec3(0.185, 0.245, 0.255);
  vec3 mutedTeal = vec3(0.305, 0.415, 0.400);
  vec3 warmGray = vec3(0.545, 0.530, 0.500);

  vec4 historySample = sampleAdvectedPigment(historyUv, texel, velocity, kick);
  float history = clamp(historySample.a, 0.0, 1.0);
  float retainedDensity = history * uFeedbackRetention;
  float historyPresence = smoothstep(0.015, 0.22, history);
  vec3 historyBase = mix(
    mutedTeal,
    warmGray,
    clamp(curtain * 0.28 + field * 0.16, 0.0, 0.44)
  );
  vec3 transportedPigment = mix(historyBase, historySample.rgb, historyPresence);
  transportedPigment = mix(
    historyBase,
    transportedPigment,
    uHistoryColorRetention
  );

  float shadowResidual = smoothstep(0.46, 0.90, 1.0 - silhouetteSoft);
  vec3 injectionColor = pigmentInjectionColor(
    materialUv,
    field,
    curtain,
    shadowResidual
  );
  float shadowMass = smoothstep(0.30, 0.84, 1.0 - silhouetteSoft);
  float middleMass = smoothstep(
    0.18,
    0.78,
    1.0 - abs(sourceSoft - 0.50) * 2.0
  );
  float highlightMass = smoothstep(0.56, 0.94, sourceSoft);
  vec3 tonalMass = mix(
    mutedTeal,
    warmGray,
    clamp(field * 0.46 + curtain * 0.18, 0.0, 0.64)
  );
  tonalMass = mix(
    tonalMass,
    smokyBlueGray,
    shadowMass * clamp(0.50 + uShadowMassStrength * 0.75, 0.0, 0.78)
  );
  tonalMass = mix(
    tonalMass,
    mix(ivory, pearl, curtain),
    highlightMass * 0.38
  );
  injectionColor = mix(
    injectionColor,
    tonalMass,
    0.52 + shadowMass * 0.24 + middleMass * 0.10
  );
  float sourceGain = clamp(0.050 + uSourceMix * 1.12, 0.060, 0.31);
  float injectionMask = clamp(
    sourceSoft * 0.70 + shadowResidual * 0.22 + curtain * 0.08,
    0.0,
    1.0
  );
  float injectionAlpha = clamp(
    injectionMask * sourceGain * (1.0 + kick * 0.34),
    0.0,
    0.36
  );
  float accumulatedPigment = 1.0
    - (1.0 - retainedDensity) * (1.0 - injectionAlpha);
  vec3 accumulated = screenBlend(
    transportedPigment * retainedDensity,
    injectionColor * injectionAlpha
  );
  vec3 pigmentColor = mix(
    transportedPigment,
    injectionColor,
    injectionAlpha * (0.64 + kick * 0.12)
  );
  pigmentColor = mix(
    pigmentColor,
    accumulated,
    0.16 + accumulatedPigment * 0.16
  );

  float fiber = wovenPigmentFiber(historyUv, curtain);
  vec2 grainUv = floor(historyUv * uResolution);
  float grain = hash(grainUv + vec2(uTime * 53.0, uTime * 31.0));
  float liquidMemory = mix(sourceSoft, history, 0.86);
  float pigment = clamp(
    mix(liquidMemory, silhouetteSoft, 0.18)
    + accumulatedPigment * 0.10
    + (field - 0.5) * 0.045,
    0.0,
    1.0
  );
  pigment = clamp(
    pigment
    + (fiber - 0.5) * (0.045 + kick * 0.010)
    + (grain - 0.5) * (0.007 + kick * 0.003),
    0.0,
    1.0
  );

  float translucency = translucentHistory(history, curtain);
  float paletteDrift = sin(
    uTime * 0.075 + field * 4.2 + curtain * 2.6
  ) * 0.5 + 0.5;
  float blueVeil = smoothstep(0.44, 0.86, field + curtain * 0.30)
    * (0.62 + paletteDrift * 0.38);
  float warmVeil = smoothstep(0.42, 0.88, 1.0 - field + curtain * 0.14)
    * (0.075 + (1.0 - paletteDrift) * 0.105);
  float colorWave = sin(
    historyUv.x * 8.4 + curtain * 4.2 + sin(historyUv.y * 2.5) * 0.7
  ) * 0.5 + 0.5;
  float rustVein = smoothstep(0.82, 0.98, colorWave)
    * (1.0 - smoothstep(0.52, 0.94, pigment));
  float sageVeil = smoothstep(0.58, 0.90, 1.0 - colorWave)
    * smoothstep(0.34, 0.82, curtain);

  vec3 color = mix(
    tonalMass,
    pigmentColor,
    0.44 + accumulatedPigment * 0.24
  );
  color = mix(
    color,
    mix(ivory, pearl, translucency),
    highlightMass * 0.14
  );
  color = mix(
    color,
    smokyBlueGray,
    clamp(shadowResidual * 0.12 + (1.0 - pigment) * 0.04, 0.0, 0.16)
  );
  color = mix(color, warmBeige, warmVeil);
  color = mix(color, dustyBlue, blueVeil * (0.28 + shadowResidual * 0.16));
  color = mix(color, sage, sageVeil * 0.14);
  color = mix(color, rust, rustVein * 0.095);
  color = mix(
    color,
    ink,
    shadowResidual * uShadowMassStrength * (0.32 + middleMass * 0.10)
  );

  float contourProbe = advectedSilhouetteField(
    sourceUv + vec2(texel.x * 4.0, texel.y * 1.5),
    texel,
    velocity
  );
  float pigmentRidge = smoothstep(
    0.035,
    0.16,
    abs(silhouetteSoft - contourProbe)
  );
  color = mix(color, ink, pigmentRidge * (0.045 + kick * 0.012));

  // Keep palette cards meaningful without flattening the in-frame color variety.
  vec3 selectedTone = mix(uMidColor, uLightColor, smoothstep(0.28, 0.86, pigment));
  color = mix(color, selectedTone, 0.045 + clamp(uIntensity, 0.0, 1.0) * 0.025);
  float fiberContrast = (fiber - 0.5) * 2.0;
  color = mix(
    color,
    paleGray,
    smoothstep(0.18, 0.82, abs(fiberContrast)) * 0.15
  );
  color += fiberContrast * (0.018 + shadowResidual * 0.014);
  color += (grain - 0.5) * (0.003 + kick * 0.0015);
  color = mix(
    color,
    pearl,
    uBloom * (0.028 + highlightMass * 0.10)
  );
  color = mix(color, uBackgroundColor, (1.0 - accumulatedPigment) * 0.045);

  if (uColorMode > 0.5) {
    color = vec3(luminance(color));
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), accumulatedPigment);
}
`

export const DISPLAY_FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`

export const EXPORT_WIDTH = 1920
export const EXPORT_HEIGHT = 1080
