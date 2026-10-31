import { GLOBE, HOME_ROTATION, ZOOM_VIDEO } from './deep-zoom-map.mjs'

const DEGREES = Math.PI / 180

// The planet is drawn to match the first frame of the zoom video, so the swap
// from this scene to the video is not noticeable. Every number below was
// measured on that frame (ring averages of colour around the planet's centre):
//   - COLOR_GAIN / COLOR_OFFSET move the flat map's land and sea colours onto the
//     video planet's (land ~235,230,221 and sea ~153,179,194);
//   - HAZE brightens the sea towards the edge, as the video's atmosphere does;
//   - RIM is the thin bright band just inside the edge;
//   - GLOW_* is the glow outside the edge: brightest at GLOW_RADIUS and falling
//     off exponentially, faster in red than in blue, which is why it shades from
//     white-blue to deep blue.
const COLOR_GAIN = [0.796, 0.818, 1.03]
const COLOR_OFFSET = [0.1745, 0.1604, -0.0176]
const HAZE_COLOR = [0.92, 0.93, 0.985]
const HAZE_STRENGTH = 0.14
const RIM_BOOST = [0.045, 0.1, 0.135]
const GLOW_RADIUS = 276.8
const GLOW_PEAK = [0.384, 0.494, 0.596]
const GLOW_FALLOFF = [3.9, 5.3, 6.1]

// The planet, its sky and (once the clip takes over) the clip itself are redrawn
// as a black-ink drafting sheet: thin outlines, stippled and hatched tones, solid
// black for the darkest shapes, + marks on a grid and a thin frame. Stars stay,
// as small black dots.

// The satellite-picture look of the supplied reference, shared by the planet and the clip: white grainy
// land, near-black mottled sea flecked with white, grey blobs where the map has its grey patches, solid
// black where it has black ones, ragged coasts, and (closer in) the map's own fine lines. Where things
// are always comes from the map. `p` is a point of the ground (on the planet: the unit sphere) and
// `grainLevel` log2 of how many grains one unit of p spans on screen, so the grain is about a pixel
// whatever the zoom and stays on the ground as it turns or grows.
const STYLE_CODE = `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm3(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 3; i++) {
      sum += noise3(p) * amp;
      p = p * 2.03 + 11.7;
      amp *= 0.5;
    }
    return sum;
  }
  // two octaves crossed as the view grows, so the grain never swims
  float grain3(vec3 p, float level) {
    float lower = exp2(floor(level));
    return mix(noise3(p * lower), noise3(p * lower * 2.0 + 5.3), fract(level));
  }
  // Detail at every zoom: octaves set against the screen (one per halving of the grain), each crossed
  // in as the view grows, so new detail keeps coming in as you go closer and the texture never just
  // gets bigger. 0..1.
  float layered(vec3 p, float level) {
    float sum = 0.0;
    sum += grain3(p, level) * 0.10;
    sum += grain3(p + 1.7, level - 1.0) * 0.16;
    sum += grain3(p + 3.1, level - 2.0) * 0.22;
    sum += grain3(p + 5.9, level - 3.0) * 0.25;
    sum += grain3(p + 8.3, level - 4.0) * 0.27;
    return sum;
  }
  // land: 0 sea to 1 land (soft); inland: 1 well away from the coast; blurred: the line map blurred so
  // its lines fade and only its filled patches stay dark; lineLum: the line map itself; lines: how much
  // of its fine lines to draw. The land is a sunlit, crumpled snowfield and the sea a dark forest
  // canopy, both lit from the upper left, with many shades between black and white.
  vec3 styleLook(vec3 p, float grainLevel, float land, float landSoft, float inland, float blurred, float narrow, float lineLum, float lines) {
    float h = layered(p, grainLevel);
    // relief: how the ground's height changes from pixel to pixel, lit from the upper left
    vec2 slope = vec2(dFdx(h), dFdy(h));
    float relief = clamp(dot(slope, vec2(-0.75, 0.66)) * 4.0, -0.6, 0.6);
    float wide = fbm3(p * 90.0);
    // ragged coasts, ragged again closer in
    // The coast, as in the reference, is no line but a ragged band of scattered pixels: land and sea
    // decided pixel by pixel against a noisy threshold over a softened coast, so its exact course
    // (which differs a little between the map and the clip's frames) never shows as a jump.
    float coastNoise = (fbm3(p * 260.0) - 0.5) * 0.45 + (layered(p, grainLevel - 2.5) - 0.5) * 0.4;
    float pixelNoise = hash3(floor(p * exp2(grainLevel)) + 0.37) - 0.5;
    float landAmount = step(0.5, mix(land, landSoft, 0.3) + coastNoise + pixelNoise * 0.45);

    // land: bright, finely crumpled, with small shadowed hollows and the odd dark grain
    float snow = 0.83 + 0.22 * (h - 0.5) + relief * 0.75 - 0.07 * smoothstep(0.45, 0.8, wide);
    snow -= smoothstep(0.36, 0.22, h) * 0.32;
    // clustered grey pockets, as in the reference's snowfields
    float pockets = layered(p + 9.0, grainLevel - 1.5);
    snow -= smoothstep(0.56, 0.74, pockets) * (0.28 + 0.2 * relief);
    snow -= step(0.94, grain3(p + 2.3, grainLevel - 0.5)) * 0.35;
    snow = clamp(snow, 0.18, 1.0);

    // What lies on the land, made up but kept on the ground (and new detail coming in as you go
    // closer), as in the reference: dark stands of forest with ragged, scattered edges and white
    // flecks inside, small grey pools, and drifts of dark specks over the snow.
    vec3 warp = vec3(fbm3(p * 70.0 + 2.0), fbm3(p * 70.0 + 5.0), fbm3(p * 70.0 + 8.0)) - 0.5;
    // Where things are is fixed on the ground (so the dense places stay where they are as you go closer,
    // and new detail only fills them in): the stands' layout comes from the ground itself, and only
    // their ragged edges from the screen-sized detail.
    // A few regions of the land are busy (a very broad mask); elsewhere it stays plain white snow.
    float region = smoothstep(0.42, 0.56, fbm3(p * 4.5 + 7.0));
    float stands = fbm3(p * 13.0 + warp * 0.25 + 4.0) * 0.8 + (layered(p + 17.0, grainLevel - 3.5) - 0.5) * 0.22;
    stands = mix(0.0, stands, region);
    // Towards the coast the land keeps its bright tone, so its shape still reads against the dark sea:
    // the stands, drifts and pools thin out gradually there (a ragged fade, not a cut-out rim).
    float coastKeep = smoothstep(0.55, 0.97, landSoft);
    float forestOnLand = step(0.5, smoothstep(0.38, 0.47, stands) - (1.0 - coastKeep) * 0.75 + pixelNoise * 0.6);
    float trees = layered(p * vec3(1.0, 3.2, 1.0) + 23.0, grainLevel);
    float core = smoothstep(0.46, 0.58, stands);
    float standColor = mix(0.5, 0.24, core) + 0.24 * (trees - 0.5) + relief * 0.35;
    standColor += step(0.86, hash3(floor(p * exp2(grainLevel)) + 3.3)) * 0.4 * (1.0 - core);
    snow = mix(snow, clamp(standColor, 0.14, 0.85), forestOnLand);
    // drifts of dark specks, thick in some places and none in others
    float drift = smoothstep(0.31, 0.41, stands) * (1.0 - forestOnLand);
    snow = mix(snow, 0.38 + 0.2 * h, step(hash3(floor(p * exp2(grainLevel)) + 7.1), drift * 0.5 * coastKeep));
    // small pools, round-ish, with pixel edges
    float pools = fbm3(p * 60.0 + warp * 0.3 + 41.0) * 0.85 + (layered(p + 41.0, grainLevel - 3.0) - 0.5) * 0.15;
    float pool = step(0.5, smoothstep(0.62, 0.68, pools) * region - (1.0 - coastKeep) * 0.8 + pixelNoise * 0.4) * (1.0 - forestOnLand);
    snow = mix(snow, 0.55 + 0.12 * (h - 0.5), pool);

    // sea: a dark canopy, streaked, lit at the ridges, flecked with white
    float canopy = layered(p * vec3(1.0, 2.6, 1.0), grainLevel);
    float forest = 0.015 + 0.46 * pow(canopy, 2.2) + relief * 0.45 + 0.06 * smoothstep(0.4, 0.85, wide);
    forest *= 0.55 + 0.45 * smoothstep(0.25, 0.7, layered(p + 13.0, grainLevel - 3.0));
    forest += step(0.87, grain3(p + 4.4, grainLevel - 0.6)) * 0.8 * smoothstep(0.3, 0.6, canopy);
    forest = clamp(forest, 0.0, 1.0);

    float v = mix(forest, snow, landAmount);
    // the map's grey patches as flat grey pools, its black ones solid
    // (not round solid shapes: a ring of their own blur would read as an outline)
    float grey = smoothstep(0.8, 0.66, blurred) * smoothstep(0.9, 0.72, narrow) * inland;
    v = mix(v, 0.5 + 0.12 * (h - 0.5) + relief * 0.12, grey * 0.9);
    // solid shapes (lakes, houses) from the lightly blurred map, their edges scattered like the coast
    float black = step(0.5, smoothstep(0.55, 0.3, narrow) + pixelNoise * 0.5) * inland;
    v = mix(v, 0.05 + 0.1 * h, black);
    // contrast like the reference: deep blacks and bright whites, the greys between kept
    v = mix(v, v * v * (3.0 - 2.0 * v), 0.6);
    // fine lines (roads, rivers, dashes) over the land
    // only well inside the land (roads, rivers): no outlines along the coasts, which are told by tone alone
    float ink = (1.0 - smoothstep(0.35, 0.6, lineLum)) * lines * landAmount * inland * (1.0 - grey);
    v = mix(v, 0.1 + 0.15 * h, ink * 0.95);
    return vec3(v);
  }
`

// The last pass: the whole picture as pixel art. It is sampled once per block of uPixel x uPixel screen
// pixels and its shades are cut down to a few greys, mixed by an ordered (Bayer) dither, so detail is
// told with small square pixels instead of smooth shading.
const PIXEL_FRAGMENT = `
  precision highp float;
  uniform sampler2D uImage;
  uniform vec2 uResolution;
  uniform float uPixel;
  uniform float uOn;
  varying vec2 vUv;
  float bayer4(vec2 cell) {
    vec2 a = mod(cell, 4.0);
    float i = a.x + a.y * 4.0;
    // the 4 x 4 Bayer matrix, row by row
    float m[16];
    m[0] = 0.0; m[1] = 8.0; m[2] = 2.0; m[3] = 10.0;
    m[4] = 12.0; m[5] = 4.0; m[6] = 14.0; m[7] = 6.0;
    m[8] = 3.0; m[9] = 11.0; m[10] = 1.0; m[11] = 9.0;
    m[12] = 15.0; m[13] = 7.0; m[14] = 13.0; m[15] = 5.0;
    float v = 0.0;
    for (int k = 0; k < 16; k++) if (float(k) == i) v = m[k];
    return (v + 0.5) / 16.0;
  }
  void main() {
    if (uOn < 0.5) {
      gl_FragColor = vec4(texture2D(uImage, vUv).rgb, 1.0);
      return;
    }
    vec2 cell = floor(vUv * uResolution / uPixel);
    vec3 c = texture2D(uImage, (cell + 0.5) * uPixel / uResolution).rgb;
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    // seven greys, from near black to near white
    float levels = 6.0;
    // irregular dither (half ordered, half random), so the pixels cluster like hand-placed ones
    // instead of making a regular screen
    float r = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    float q = floor(lum * levels + mix(bayer4(cell), r, 0.7)) / levels;
    q = clamp(q, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.04 + q * 0.93), 1.0);
  }
`

const SKETCH_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const SKETCH_FRAGMENT = `
  precision highp float;
  uniform sampler2D uScene;
  uniform sampler2D uVideo;
  uniform float uGlobeMix;
  uniform vec2 uResolution;
  uniform float uAmount;
  uniform vec2 uPlanet;
  uniform vec2 uPlanetCenter;
  uniform float uSpace;
  uniform float uStyle;
  uniform vec2 uVideoPlanet;
  uniform vec2 uVideoCenter;
  uniform float uSkyOn;
  uniform float uLimbRatio;
  uniform float uStarsOn;
  uniform float uColorOn;
  uniform sampler2D uMask;
  uniform float uGridOn;
  uniform float uWorldOn;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // The planet's scene (k = 0) and the clip's frame (k = 1) are each drawn as a
  // sketch on their own, and the two sketches are then cross-faded.
  // The clip's planet is a little smaller at its edge than the 3D planet whose
  // land lines up with it. Squeeze the 3D picture towards the middle, only out
  // near the rim, so the rims meet and the land in the middle does not move.
  vec2 squeeze(vec2 uv) {
    vec2 rel = (uv * uResolution - 0.5 * uResolution - uPlanetCenter) / uPlanet;
    float r = length(rel);
    if (uLimbRatio < 0.9999 && r > 0.45) {
      float edge = uLimbRatio;
      float mapped = r < edge
        ? 0.45 + (r - 0.45) * (1.0 - 0.45) / (edge - 0.45)
        : 1.0 + (r - edge);
      uv = (rel * (mapped / r) * uPlanet + 0.5 * uResolution + uPlanetCenter) / uResolution;
    }
    return uv;
  }

  vec3 src(vec2 uv, float k) {
    if (k > 0.5) return texture2D(uVideo, uv).rgb;
    return texture2D(uScene, squeeze(uv)).rgb;
  }

  // How much of a star is at this spot of the sky pass: bright points that stand out
  // from their surroundings. Faint, tiny ones are not stars worth drawing.
  float starAt(vec2 uv) {
    float s = max(0.6, uResolution.x / 1500.0);
    vec2 near = 2.0 / uResolution;
    vec2 far = 8.0 * s / uResolution;
    float here = dot(texture2D(uScene, uv).rgb, vec3(0.333));
    float glow = (here * 2.0
      + dot(texture2D(uScene, uv + vec2(near.x, 0.0)).rgb, vec3(0.333))
      + dot(texture2D(uScene, uv - vec2(near.x, 0.0)).rgb, vec3(0.333))
      + dot(texture2D(uScene, uv + vec2(0.0, near.y)).rgb, vec3(0.333))
      + dot(texture2D(uScene, uv - vec2(0.0, near.y)).rgb, vec3(0.333))) / 6.0;
    float around = (dot(texture2D(uScene, uv + vec2(far.x, 0.0)).rgb, vec3(0.333))
      + dot(texture2D(uScene, uv - vec2(far.x, 0.0)).rgb, vec3(0.333))
      + dot(texture2D(uScene, uv + vec2(0.0, far.y)).rgb, vec3(0.333))
      + dot(texture2D(uScene, uv - vec2(0.0, far.y)).rgb, vec3(0.333))) * 0.25;
    float star = smoothstep(0.06, 0.2, glow - around * 1.3);
    return step(0.5, star) * star;
  }

  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
  }

  // Night side of the planet in the colour map: light comes from the upper left, the
  // lower right sinks into shadow.
  float nightShade(vec2 rel) {
    float t = dot(rel, vec2(0.70, -0.72));
    float body = smoothstep(-0.05, 0.92, t);
    // a little darkening towards the rim all round, so it reads as a ball
    // (only on the side that is turning into shadow: the lit rim stays bright)
    float limb = smoothstep(0.78, 1.0, length(rel)) * 0.30 * smoothstep(0.0, 0.5, t);
    return clamp(pow(body, 1.25) + limb, 0.0, 1.0);
  }

  // The planet the sketch is drawn around: the 3D one, or none at all when only the
  // sky is wanted.
  vec2 gPlanet = vec2(1.0);

  vec3 sheet(vec3 color, float inkAmount, vec2 px, float s);

  ${STYLE_CODE}

  // The clip in the textured look: where its land is (one small picture per frame, in a sheet of
  // 9 x 9), and where on the ground the view is, so the grain and the coast's raggedness sit on the
  // ground exactly as they do on the planet.
  uniform sampler2D uClipLand;
  uniform float uClipLandOn;
  uniform vec2 uClipCell;
  uniform float uClipAllLand;
  uniform float uClipScale;
  uniform float uPixel;
  uniform vec2 uClipCenter;
  // the point of the planet (unit sphere) under a point of the home view at scale 1 (frame units, y up)
  vec3 clipGround(vec2 w) {
    float cb = cos(${(HOME_ROTATION.pitch * DEGREES).toFixed(6)});
    float sb = sin(${(HOME_ROTATION.pitch * DEGREES).toFixed(6)});
    float k = ${GLOBE.verticalStretch.toFixed(4)};
    float r = ${GLOBE.radius.toFixed(1)};
    float A = (sb / k) * (sb / k) + cb * cb;
    float B = 2.0 * (w.y * cb * sb / (k * k) - w.y * sb * cb);
    float C = w.x * w.x + (w.y * cb / k) * (w.y * cb / k) + (w.y * sb) * (w.y * sb) - r * r;
    float t = (-B + sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A);
    vec3 v = vec3(w.x, (w.y * cb + t * sb) / k, -w.y * sb + t * cb);
    float ca = cos(${(HOME_ROTATION.yaw * DEGREES).toFixed(6)});
    float sa = sin(${(HOME_ROTATION.yaw * DEGREES).toFixed(6)});
    return vec3(v.x * ca - v.z * sa, v.y, v.x * sa + v.z * ca) / r;
  }
  float clipLand(vec2 uv) {
    if (uClipAllLand > 0.5 || uClipLandOn < 0.5) return 1.0;
    return texture2D(uClipLand, uClipCell + clamp(uv, 0.002, 0.998) * vec2(1.0 / 9.0, 1.0 / 9.0)).r;
  }

  vec3 draw(float k) {
    float s = max(0.6, uResolution.x / 1500.0);
    vec2 px = vUv * uResolution;

    // A technical pen is steady: only a faint wobble.
    vec2 wobble = (vec2(noise(px / (70.0 * s)), noise(px / (70.0 * s) + 17.0)) - 0.5) * 1.6 * s;
    vec2 p = px + wobble;
    vec2 uv = p / uResolution;

    vec3 here = src(uv, k);
    float lum = dot(here, vec3(0.299, 0.587, 0.114));
    vec3 hsv = rgb2hsv(here);

    vec3 paper = vec3(0.985, 0.984, 0.978) - (noise(px / (1.5 * s)) - 0.5) * 0.014;
    vec3 ink = vec3(0.07, 0.07, 0.08);

    vec2 rel = (vUv * uResolution - 0.5 * uResolution - uPlanetCenter) / gPlanet;

    // ---- where the sky is empty (and so where the stars live) ------------------------
    vec2 far = 8.0 * s / uResolution;
    float around = (dot(src(uv + vec2(far.x, 0.0), k), vec3(0.333))
      + dot(src(uv - vec2(far.x, 0.0), k), vec3(0.333))
      + dot(src(uv + vec2(0.0, far.y), k), vec3(0.333))
      + dot(src(uv - vec2(0.0, far.y), k), vec3(0.333))) * 0.25;
    float sky = (1.0 - smoothstep(0.05, 0.16, around)) * uSkyOn;

    // ---- tone: light grey shading, a fine dot screen for water, black for the darkest ----
    float shade = 1.0 - smoothstep(0.3, 0.95, lum);
    // Over the planet the dark glow band around the limb is not ink.
    shade *= mix(1.0, smoothstep(0.34, 0.5, lum), uSkyOn);
    float sea = smoothstep(0.08, 0.2, hsv.y) * step(0.5, hsv.x) * step(hsv.x, 0.74) * smoothstep(0.35, 0.5, lum);

    // Stars are small black dots, bigger and darker when brighter; the Milky Way is a
    // faint grey dot screen.
    vec2 near = 2.0 / uResolution;
    float glow = (dot(here, vec3(0.333)) * 2.0
      + dot(src(uv + vec2(near.x, 0.0), k), vec3(0.333))
      + dot(src(uv - vec2(near.x, 0.0), k), vec3(0.333))
      + dot(src(uv + vec2(0.0, near.y), k), vec3(0.333))
      + dot(src(uv - vec2(0.0, near.y), k), vec3(0.333))) / 6.0;
    float star = smoothstep(0.06, 0.2, glow - around * 1.3);
    float cloud = smoothstep(0.02, 0.22, around) * 0.16;

    // Dot screen: very fine dots, their number following the tone.
    vec2 dotCell = floor(px / max(1.0, s * 0.9));
    float dotRand = hash(dotCell + 7.0);
    float waterDots = step(dotRand, 0.03) * sea;
    float cloudDots = step(dotRand, cloud) * 0.7;
    float darkDots = step(dotRand, shade * 0.7) * smoothstep(0.35, 0.6, shade) * (1.0 - sea);

    // Hatching for the mid-dark shapes, solid black for the darkest.
    float hatchLine = step(0.8, fract((px.x + px.y) / (3.2 * s)));
    float hatch = hatchLine * smoothstep(0.5, 0.62, shade) * (1.0 - smoothstep(0.8, 0.88, shade));
    float solid = smoothstep(0.82, 0.92, shade);

    float inkAmount = (1.0 - sky) * max(max(hatch * 0.8, solid), max(waterDots * 0.5, darkDots * 0.7));
    // only the stars themselves: a dot screen for the glow would stay put on the screen while the
    // sky turns with the planet
    inkAmount = max(inkAmount, sky * step(0.5, star) * star);

    // Galaxies are drawn in the red channel only: a solid dark core, then a dotted halo
    // whose density follows the picture, and the spiral arms come out as dark dashes.
    float redOnly = clamp(here.r - 0.5 * (here.g + here.b), 0.0, 1.0);
    float galaxy = pow(smoothstep(0.03, 0.95, redOnly), 1.7) * uSkyOn * smoothstep(1.02, 1.12, length(rel));
    float galaxyDots = step(dotRand, galaxy * 1.3) * (0.28 + 0.6 * smoothstep(0.3, 0.85, redOnly));
    float galaxyCore = smoothstep(0.88, 0.98, redOnly) * uSkyOn;
    inkAmount = max(inkAmount, galaxyCore);


    // ---- outline: fine steady lines -------------------------------------------------------
    // Step edges (coasts) from a one-pixel gradient; thin dark lines (borders, roads)
    // from how much darker a point is than its surroundings.
    vec2 d1 = 0.8 / uResolution;
    float edge = length(src(uv + vec2(d1.x, 0.0), k) - src(uv - vec2(d1.x, 0.0), k))
      + length(src(uv + vec2(0.0, d1.y), k) - src(uv - vec2(0.0, d1.y), k));
    vec2 d2 = 2.2 / uResolution;
    float mean = (dot(src(uv + vec2(d2.x, 0.0), k), vec3(0.333))
      + dot(src(uv - vec2(d2.x, 0.0), k), vec3(0.333))
      + dot(src(uv + vec2(0.0, d2.y), k), vec3(0.333))
      + dot(src(uv - vec2(0.0, d2.y), k), vec3(0.333))) * 0.25;
    float ridge = smoothstep(0.025, 0.1, mean - dot(here, vec3(0.333)));
    // The clip's sea is mottled photo noise, so only the land is searched for fine
    // lines; coasts come from land versus sea colour, which is much cleaner.
    float notSea = k > 0.5 ? 1.0 - sea : 1.0;
    float line = max(smoothstep(0.16, 0.5, edge) * 0.8, ridge * 0.9) * notSea;
    if (k > 0.5) {
      vec2 dl = 1.3 / uResolution;
      float landL = smoothstep(-0.08, 0.0, src(uv + vec2(dl.x, 0.0), k).r - src(uv + vec2(dl.x, 0.0), k).b);
      float landR = smoothstep(-0.08, 0.0, src(uv - vec2(dl.x, 0.0), k).r - src(uv - vec2(dl.x, 0.0), k).b);
      float landU = smoothstep(-0.08, 0.0, src(uv + vec2(0.0, dl.y), k).r - src(uv + vec2(0.0, dl.y), k).b);
      float landD = smoothstep(-0.08, 0.0, src(uv - vec2(0.0, dl.y), k).r - src(uv - vec2(0.0, dl.y), k).b);
      float coast = abs(landL - landR) + abs(landU - landD);
      line = max(line, smoothstep(0.55, 0.95, coast));
    }
    line *= (1.0 - sky);
    // The globe's edge is the same thin ring in both pictures, so it does not double
    // up when they cross-fade; the clip's own glowing rim is not drawn.
    float rimDist = (sqrt(dot(rel, rel)) - 1.0) * gPlanet.x;
    if (k > 0.5 && uSkyOn > 0.5) {
      line *= smoothstep(2.5, 5.0, abs(rimDist));
      line = max(line, 1.0 - smoothstep(0.5, 1.2, abs(rimDist)));
    }
    inkAmount = max(inkAmount, line);

    // Relief shading: a light grey tint under everything that is not white paper.
    vec3 color = mix(paper, vec3(0.78, 0.78, 0.77), shade * 0.5 * (1.0 - sky));
    color = mix(color, ink, clamp(inkAmount, 0.0, 1.0));

    // The planet's own map is a finished line drawing: show it straight.
    float inPlanet = step(dot(rel, rel), uLimbRatio * uLimbRatio) * (1.0 - k);
    // In colour the planet is wherever the real sphere was drawn (the mask), not the
    // estimated ellipse, which can fall a pixel or two short and leave a pale sliver.
    inPlanet = max(inPlanet, uColorOn * smoothstep(0.0, 0.3, texture2D(uMask, vUv).r) * (1.0 - k));
    float planetLum = dot(src(vUv, k), vec3(0.333));
    // (the textured look keeps all its shades: no contrast curve)
    float planetInk = mix(1.0 - smoothstep(0.1, 0.97, planetLum), 1.0 - planetLum, uStyle);
    vec3 planetColor = mix(mix(paper, ink, planetInk), here, uColorOn);
    color = mix(color, planetColor, inPlanet);
    inkAmount = mix(inkAmount, planetInk, inPlanet);

    // Colour map on: the sheet gives way to real night sky, the sky pass shown as it is
    // (stars, the Milky Way photographs, galaxies as soft blue glows).
    if (uColorOn > 0.001 && uSkyOn > 0.5) {
      vec3 raw = texture2D(uScene, vUv).rgb;
      float redGlow = clamp(raw.r - 0.5 * (raw.g + raw.b), 0.0, 1.0);
      vec3 sky = raw;
      sky.r = min(sky.r, max(sky.g, sky.b));
      sky += max(redGlow - 0.04, 0.0) * vec3(0.9) * 0.8;
      sky = max(sky - 0.03, 0.0) * 1.25;
      sky = vec3(dot(sky, vec3(0.299, 0.587, 0.114))) + vec3(0.016);
      // The drawn planet is a little smaller than its ellipse; in colour the sky starts
      // exactly at its real edge so nothing of the sheet is left between them.
      float limbR = uLimbRatio * mix(1.0, 0.991, uColorOn);
      float edgeSoft = mix(0.026, 0.0012, uColorOn);
      float awayRing = smoothstep(uLimbRatio + 0.002, uLimbRatio + 0.002 + edgeSoft, length(rel));
      // In colour the planet's own silhouette is known exactly (a mask pass), so the
      // sky meets it with nothing of the sheet left between.
      float away = mix(awayRing, 1.0 - texture2D(uMask, vUv).r, uColorOn);
      // Where the planet's edge partly covers a pixel, the picture there is part planet;
      // the sky behind it is just the dark.
      sky = mix(sky, vec3(0.016), uColorOn * step(0.001, texture2D(uMask, vUv).r));
      color = mix(color, sky, away * uColorOn);
      inkAmount = mix(inkAmount, 0.0, away * uColorOn);
    }

    // World layer off: the planet (or the clip) is not drawn, only the sheet.
    if (uWorldOn < 0.5) {
      float hide = k > 0.5 ? 1.0 : step(dot(rel, rel), 1.03);
      color = mix(color, paper, hide);
      inkAmount = mix(inkAmount, 0.0, hide);
    }

    return sheet(color, inkAmount, px, s);
  }

  // ---- the drafting sheet: + marks on a grid, and a thin frame, over the planet or the clip ----
  vec3 sheet(vec3 color, float inkAmount, vec2 px, float s) {
    vec3 ink = vec3(0.07, 0.07, 0.08);
    float grid = 120.0 * s;
    vec2 cellPos = (floor(px / grid) + 0.5) * grid;
    vec2 off = abs(px - cellPos);
    float arm = 4.5 * s;
    float thin = 0.6 * s;
    float plus = max(step(off.x, thin) * step(off.y, arm), step(off.y, thin) * step(off.x, arm));
    color = mix(color, vec3(0.45), plus * 0.7 * (1.0 - inkAmount) * uGridOn * (1.0 - uColorOn));

    float inset = 16.0 * s;
    vec2 edgeDist = min(px, uResolution - px);
    float frame = step(abs(min(edgeDist.x, edgeDist.y) - inset), 0.7 * s)
      * step(inset - 1.0, min(edgeDist.x, edgeDist.y)) ;
    color = mix(color, ink, frame * 0.9 * uGridOn * (1.0 - uColorOn));

    return color;
  }

  // Brighter, fresher light on the sunlit side: lifts the highlights and the midtones
  // (the shadow below is left as it was).
  vec3 sunLift(vec3 color, vec2 rel) {
    float lit = 1.0 - smoothstep(-0.05, 0.92, dot(rel, vec2(0.70, -0.72)));
    vec3 lifted = color + (vec3(1.0) - color) * 0.26 * lit;
    return lifted * mix(vec3(1.0), vec3(0.97, 1.03, 1.05), lit);
  }

  // How far this pixel is outside an ellipse (centred in the frame plus an offset),
  // in pixels along the width: negative inside.
  float beyondEllipse(vec2 axes, vec2 offset) {
    vec2 rv = (vUv * uResolution - 0.5 * uResolution - offset) / axes;
    return (length(rv) - 1.0) * axes.x;
  }

  // Takes out whatever outline the picture has at the planet's rim: the rim itself and,
  // fading out inwards, the lines that run along it just inside (coasts of the polar
  // caps), so only one line is left to show once the ring is redrawn.
  vec3 clearRim(vec3 color, vec3 inward, float beyond, float s) {
    // Full strength at the ring, thinning out gradually towards the middle of the planet
    // so the map fades into the rim instead of stopping at a hard edge.
    float band = smoothstep(-44.0 * s, -4.0 * s, beyond) * (1.0 - smoothstep(5.0 * s, 8.0 * s, beyond));
    // In colour there is no ring to make room for: only the drawn rim line itself goes.
    float narrow = smoothstep(-5.0 * s, -3.0 * s, beyond) * (1.0 - smoothstep(0.5 * s, 2.5 * s, beyond));
    band = mix(band, narrow, uColorOn);
    return mix(color, mix(vec3(0.985, 0.984, 0.978), inward, uColorOn), band);
  }

  vec3 inkRim(vec3 color, float beyond, float s) {
    float ring = (1.0 - smoothstep(1.0 * s, 2.0 * s, abs(beyond))) * (1.0 - uColorOn);
    return mix(color, vec3(0.07, 0.07, 0.08), ring);
  }

  void main() {
    gPlanet = uPlanet;
    float px = uResolution.x / 1920.0;
    vec3 sceneColor = vec3(0.0);
    if (uGlobeMix > 0.001) {
      sceneColor = draw(0.0);
      float sceneBeyond = beyondEllipse(uPlanet * uLimbRatio * mix(1.0, 0.991, uColorOn), uPlanetCenter);
      // (the textured look has no bands at the rim: the planet simply meets the sky)
      sceneColor = mix(clearRim(sceneColor, sceneColor, sceneBeyond, px), sceneColor, uStyle);
      if (uSpace > 0.001) {
        // seen aslant, the space round the planet goes dark: the sheet there is drawn in negative,
        // so the stars and the + marks come out light
        // (in the textured look a hard edge: no sliver of the drawing sheet between planet and sky)
        float outside = mix(smoothstep(0.0, 2.0 * px, sceneBeyond), step(0.0, sceneBeyond), uStyle);
        vec3 night = clamp(vec3(1.055) - sceneColor, 0.0, 1.0);
        // in the textured look the sky is a grainy mid grey, as in the reference, with faint light stars
        vec2 gp = vUv * uResolution;
        float speckle = hash(floor(gp)) * 0.5 + hash(floor(gp * 0.5) + 3.1) * 0.3 + noise(gp / (6.0 * px)) * 0.2;
        // right at the planet's edge the sky's grains turn dark, a ragged fringe as in the reference
        float fringe = 1.0 - smoothstep(0.0, 16.0 * px, sceneBeyond + (hash(floor(gp / 2.0)) - 0.5) * 10.0 * px);
        vec3 greySky = vec3((0.24 + 0.34 * speckle) * (1.0 - 0.6 * fringe * step(hash(floor(gp) + 7.7), 0.75)));
        sceneColor = mix(sceneColor, mix(night, greySky, uStyle), outside * uSpace);
      }
      if (uColorOn > 0.001) {
        vec2 rsc = (vUv * uResolution - 0.5 * uResolution - uPlanetCenter) / (uPlanet * max(uLimbRatio, 0.5) * 0.991);
        // Edge pixels count as fully inside, so the shadow reaches the very rim and no
        // sliver of the lit colour is left there.
        float insideScene = smoothstep(0.0, 0.3, texture2D(uMask, vUv).r);
        sceneColor = mix(sceneColor, sunLift(sceneColor, rsc), insideScene * uColorOn);
        sceneColor = mix(sceneColor, vec3(0.016), nightShade(rsc) * insideScene * uColorOn);
        // Whatever pale sliver is left right on the shadow side's rim goes black.
        vec2 mo = 6.0 * px / uResolution;
        float mMin = min(min(texture2D(uMask, vUv + vec2(mo.x, 0.0)).r, texture2D(uMask, vUv - vec2(mo.x, 0.0)).r), min(texture2D(uMask, vUv + vec2(0.0, mo.y)).r, texture2D(uMask, vUv - vec2(0.0, mo.y)).r));
        float mMax = max(max(texture2D(uMask, vUv + vec2(mo.x, 0.0)).r, texture2D(uMask, vUv - vec2(mo.x, 0.0)).r), max(texture2D(uMask, vUv + vec2(0.0, mo.y)).r, texture2D(uMask, vUv - vec2(0.0, mo.y)).r));
        float rimBand = clamp(max(1.0 - mMin, 0.0) * step(0.001, mMax), 0.0, 1.0);
        float shadowRim = smoothstep(0.25, 0.6, nightShade(rsc));
        sceneColor = mix(sceneColor, vec3(0.016), rimBand * shadowRim * uColorOn);
        // A thin black line round the whole planet, as in the line map.
        vec2 mi = 3.2 * px / uResolution;
        float mIn = min(min(texture2D(uMask, vUv + vec2(mi.x, 0.0)).r, texture2D(uMask, vUv - vec2(mi.x, 0.0)).r), min(texture2D(uMask, vUv + vec2(0.0, mi.y)).r, texture2D(uMask, vUv - vec2(0.0, mi.y)).r));
        float edgeLine = smoothstep(0.0, 0.3, texture2D(uMask, vUv).r) * (1.0 - mIn);
        sceneColor = mix(sceneColor, vec3(0.02), clamp(edgeLine, 0.0, 1.0) * uColorOn);
      }
    }
    // The clip is already a finished line drawing on the same paper, so it is shown
    // as it is, except for the space round its planet: that is the 3D scene's own
    // sky (still, with its stars, galaxies and grid), so the background does not
    // zoom with the clip.
    vec3 videoColor = vec3(0.0);
    float videoBeyond = 0.0;
    if (uGlobeMix < 0.999) {
      videoColor = texture2D(uVideo, vUv).rgb;
      // The bottom rows hold the frame's number, not picture.
      videoColor = mix(videoColor, vec3(0.985, 0.984, 0.978), step(vUv.y, 4.0 / 1080.0));
      if (uStyle > 0.001) {
        vec2 ground = ((vUv - 0.5) * vec2(1280.0, 720.0) + uClipCenter) / uClipScale;
        float level = log2(uClipScale * ${GLOBE.radius.toFixed(1)} * (uResolution.x / 1280.0) / uPixel);
        // a touch inside the traced land, so the coast falls on the drawn coast line and no sliver of
        // land shows outside it
        float landHere = clipLand(vUv) - 0.06;
        float landSoft = 0.0;
        float blurredV = 0.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.7854;
          vec2 o = vec2(cos(a), sin(a));
          landSoft += clipLand(vUv + o * vec2(0.012, 0.0213));
          blurredV += dot(texture2D(uVideo, vUv + o * 12.0 / uResolution).rgb, vec3(0.333))
            + dot(texture2D(uVideo, vUv + o * 6.0 / uResolution).rgb, vec3(0.333));
        }
        landSoft /= 8.0;
        blurredV /= 16.0;
        float narrowV = 0.0;
        for (int i = 0; i < 4; i++) {
          float a = float(i) * 1.5708 + 0.785;
          narrowV += dot(texture2D(uVideo, vUv + vec2(cos(a), sin(a)) * 2.5 / uResolution).rgb, vec3(0.333));
        }
        narrowV = narrowV * 0.2 + dot(videoColor, vec3(0.333)) * 0.2;
        vec3 look = styleLook(clipGround(ground), level, landHere, landSoft, smoothstep(0.93, 1.0, landSoft), blurredV, narrowV, dot(videoColor, vec3(0.333)), 1.0);
        videoColor = mix(videoColor, look, uStyle);
      }
      // Inked the way the planet's own map is (see draw), with the same + marks and frame, so
      // nothing changes when the clip takes over from the planet.
      float vs = max(0.6, uResolution.x / 1500.0);
      vec2 vpx = vUv * uResolution;
      vec3 vPaper = vec3(0.985, 0.984, 0.978) - (noise(vpx / (1.5 * vs)) - 0.5) * 0.014;
      float vInk = mix(1.0 - smoothstep(0.1, 0.97, dot(videoColor, vec3(0.333))), 1.0 - dot(videoColor, vec3(0.333)), uStyle);
      videoColor = sheet(mix(vPaper, vec3(0.07, 0.07, 0.08), vInk), vInk, vpx, vs);
      if (uVideoPlanet.x > 0.0) {
        videoBeyond = beyondEllipse(uVideoPlanet, uVideoCenter);
        vec2 inDir = -normalize((vUv * uResolution - 0.5 * uResolution - uVideoCenter) + vec2(1e-3));
        vec3 inwardColor = texture2D(uVideo, vUv + inDir * 7.0 * px / uResolution).rgb;
        videoColor = clearRim(videoColor, inwardColor, videoBeyond, px);
        if (uColorOn > 0.001) {
          vec2 rvs = (vUv * uResolution - 0.5 * uResolution - uVideoCenter) / uVideoPlanet;
          float strength = 1.0 - smoothstep(0.30, 0.56, uVideoPlanet.x / uResolution.x);
          float inside = 1.0 - smoothstep(-2.0 * px, 2.0 * px, videoBeyond);
          videoColor = mix(videoColor, sunLift(videoColor, rvs), inside * uColorOn);
          videoColor = mix(videoColor, vec3(0.016), nightShade(rvs) * strength * inside * uColorOn);
          float vRim = 1.0 - smoothstep(3.0 * px, 8.0 * px, abs(videoBeyond + 1.0 * px));
          videoColor = mix(videoColor, vec3(0.016), vRim * smoothstep(0.25, 0.6, nightShade(rvs)) * strength * uColorOn);
        }
        if (uStarsOn > 0.001) {
          float outside = mix(smoothstep(6.0 * px, 14.0 * px, videoBeyond), smoothstep(0.0, 1.6 * px, videoBeyond), uColorOn);
          // On the shadow side the planet's drawn rim goes too: the dark simply continues
          // into the sky, with no line between them.
          vec2 rvo = (vUv * uResolution - 0.5 * uResolution - uVideoCenter) / uVideoPlanet;
          float shadowSide = smoothstep(0.30, 0.70, nightShade(rvo));
          float rimGone = smoothstep(-5.0 * px, -1.0 * px, videoBeyond) * shadowSide * uColorOn;
          outside = max(outside, rimGone);
          if (outside > 0.001) {
            gPlanet = vec2(0.001);
            videoColor = mix(videoColor, draw(0.0), outside);
          }
        }
      }
    }
    vec3 finalColor = mix(videoColor, sceneColor, uGlobeMix);
    // One ring for the planet's outline: the clip's while it shows, else the 3D one's.
    if (uVideoPlanet.x > 0.0 && uGlobeMix < 0.999) {
      finalColor = inkRim(finalColor, videoBeyond, px);
      // In colour the clip's globe outline is a black line, as drawn in the line map.
      float blackRing = 1.0 - smoothstep(1.2 * px, 3.6 * px, abs(videoBeyond + 1.5 * px));
      finalColor = mix(finalColor, vec3(0.02), blackRing * uColorOn);
    } else if (uGlobeMix > 0.001) {
      finalColor = mix(inkRim(finalColor, beyondEllipse(uPlanet * uLimbRatio, uPlanetCenter), px), finalColor, uStyle);
    }
    if (uColorOn > 0.001) {
      float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
      finalColor = mix(vec3(luma), finalColor, mix(1.0, 0.86, uColorOn));
    }
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

const vec3 = (values) => `vec3(${values.map((value) => value.toFixed(4)).join(', ')})`

// Builds the planet in a three.js scene that matches the zoom video's first
// frame. three.js is imported lazily so it never loads on the server.
// `clipDetails`: frames of the zoom clip laid onto the planet where they show it, sharper than its map up
// close ({ url, scale, x, y }: the planet's scale and the view's move when the frame was taken, at the
// home turn). Each one fades out towards its own edges, the finer ones over the coarser.
export async function createGlobe(canvasNode, textureUrl, milkyWayUrl, clipDetails = [], landUrl = null, clipLandUrl = null) {
  const THREE = await import('three')

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasNode,
    antialias: true,
  })
  // a little under the screen's full sharpness on high-density screens, so the textured look keeps up
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  // Opaque black, like the video's own background.
  renderer.setClearColor(0x000000, 1)

  const sketchTarget = new THREE.WebGLRenderTarget(2, 2, { samples: 4 })
  // the finished picture, before it is turned into pixel art (see PIXEL_FRAGMENT)
  const pixelTarget = new THREE.WebGLRenderTarget(2, 2)
  const pixelUniforms = {
    uImage: { value: pixelTarget.texture },
    uResolution: { value: new THREE.Vector2(2, 2) },
    uPixel: { value: 3 },
    uOn: { value: 0 },
  }
  const maskTarget = new THREE.WebGLRenderTarget(2, 2, { samples: 4 })
  const maskMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const sketchUniforms = {
    uScene: { value: sketchTarget.texture },
    uVideo: { value: null },
    uGlobeMix: { value: 1 },
    uResolution: { value: new THREE.Vector2(2, 2) },
    uAmount: { value: 1 },
    // Empty black sky exists until the clip has zoomed in to the ground.
    uSkyOn: { value: 1 },
    uLimbRatio: { value: 1 },
    uStarsOn: { value: 0 },
    uColorOn: { value: 0 },
    uMask: { value: maskTarget.texture },
    uGridOn: { value: 1 },
    uWorldOn: { value: 1 },
    // Half-axes in pixels of the planet's outline (centred in the frame); drawn
    // straight from the map instead of being redrawn as a sketch.
    uPlanet: { value: new THREE.Vector2(1, 1) },
    uPlanetCenter: { value: new THREE.Vector2(0, 0) },
    // 1 turns the space round the planet dark (while it is seen aslant)
    uSpace: { value: 0 },
    uStyle: { value: 0 },
    uClipLand: { value: null },
    uClipLandOn: { value: 0 },
    uClipCell: { value: new THREE.Vector2(0, 8 / 9) },
    uClipAllLand: { value: 0 },
    uClipScale: { value: 1 },
    uPixel: { value: 3 },
    uClipCenter: { value: new THREE.Vector2(0, 0) },
    // Half-axes in pixels of the clip's own planet (0 = it fills the frame).
    uVideoPlanet: { value: new THREE.Vector2(0, 0) },
    // Where the clip's planet is centred, in pixels from the frame's middle.
    uVideoCenter: { value: new THREE.Vector2(0, 0) },
  }
  let videoPlanet = null
  let videoPlanetFraction = 0
  const syncVideoPlanet = () => {
    const width = sketchUniforms.uResolution.value.x
    if (!videoPlanet) {
      videoPlanetFraction = 0
      sketchUniforms.uVideoPlanet.value.set(0, 0)
      return
    }
    const [cx, cy, rx, ry] = videoPlanet
    videoPlanetFraction = rx
    sketchUniforms.uVideoPlanet.value.set(rx * width, ry * width)
    // Picture rows run downwards, the sketch's upwards.
    sketchUniforms.uVideoCenter.value.set(cx * width, -cy * width)
  }
  // the textured look of the planet (see surfaceStyle in the planet's shader)
  const styleUniforms = {
    uLand: { value: null },
    uLandOn: { value: 0 },
    uStyle: { value: 0 },
    uGrain: { value: 1000 },
    uLines: { value: 0 },
    uPixel: { value: 3 },
  }
  let planetScale = 1
  let planetPitch = HOME_ROTATION.pitch
  // the view is moved by this much (scene units) to hold a chosen point of the planet at the middle
  const focusShift = { x: 0, y: 0 }
  let focusPoint = null // { longitude, latitude, amount }
  const syncPlanet = () => {
    const pxPerUnit = sketchUniforms.uResolution.value.x / ZOOM_VIDEO.width
    const radius = GLOBE.radius * planetScale * pxPerUnit
    // about one grain per 1.3 screen pixels, on the unit sphere
    styleUniforms.uGrain.value = Math.max(8, radius / styleUniforms.uPixel.value)
    // The planet is a little taller than wide and then tipped forward or back, so its outline is an
    // ellipse whose height depends on the tip.
    const tip = planetPitch * DEGREES
    const tall = Math.sqrt((GLOBE.verticalStretch * Math.cos(tip)) ** 2 + Math.sin(tip) ** 2)
    sketchUniforms.uPlanet.value.set(radius, radius * tall)
    // where the planet's middle is on screen when the view is held on a point of it (see setFocus)
    sketchUniforms.uPlanetCenter.value.set(-focusShift.x * pxPerUnit, -focusShift.y * pxPerUnit)
  }
  const sketchQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: sketchUniforms,
      vertexShader: SKETCH_VERTEX,
      fragmentShader: SKETCH_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })
  )
  let videoTexture = null
  // ---- The satellite ----------------------------------------------------------
  // A small solid model (a ball with four swept-back antennas, after Sputnik) that
  // circles the planet on a tilted ellipse, tumbling slowly. Seen from the front it
  // crosses the planet's face like a transit; at the back the planet hides it. It is
  // drawn after the sketch pass so it stays crisp.
  const satShared = {
    uAlpha: { value: 0 },
    uRadius: { value: GLOBE.radius },
    uStretch: { value: GLOBE.verticalStretch },
    uBehind: { value: 0 },
  }
  const satMaterial = (color, shine) =>
    new THREE.ShaderMaterial({
      uniforms: { ...satShared, uColor: { value: new THREE.Color(color) }, uShine: { value: shine } },
      transparent: true,
      depthTest: true,
      depthWrite: true,
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xy;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uShine;
        uniform float uAlpha;
        uniform float uRadius;
        uniform float uStretch;
        uniform float uBehind;
        varying vec3 vNormal;
        varying vec2 vWorld;
        void main() {
          // Drawn like the rest of the page: black ink on paper. Lit side stays white,
          // the turned-away side is hatched, the darkest part solid, and the outline
          // is a firm line round the edge.
          vec3 n = normalize(vNormal);
          vec3 light = normalize(vec3(-0.5, 0.7, 0.6));
          float diffuse = max(dot(n, light), 0.0);
          float facing = max(n.z, 0.0);
          vec3 ink = vec3(0.07, 0.07, 0.08);
          vec3 paper = vec3(0.985, 0.984, 0.978);
          float tone = uColor.r;
          float hatch = step(0.62, fract((gl_FragCoord.x + gl_FragCoord.y) / 3.5));
          float shade = (1.0 - smoothstep(0.12, 0.55, diffuse)) * 0.9 + 0.1 * (1.0 - facing);
          float inkAmount = max(step(0.7, shade) * hatch, step(0.93, shade));
          inkAmount = max(inkAmount, step(0.8, 1.0 - facing));
          vec3 color = mix(mix(paper, ink, inkAmount), ink, 1.0 - step(0.5, tone));
          float inside = step(length(vec2(vWorld.x, vWorld.y / uStretch)), uRadius);
          float visible = 1.0 - uBehind * inside;
          gl_FragColor = vec4(color, uAlpha * visible);
        }`,
    })
  const satellite = new THREE.Group()
  // A shiny silver ball with four very long, thin antennas fanning out behind it,
  // after Sputnik. The antennas trail to the right in the model's own space.
  const satBody = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), satMaterial(0xffffff, 0.0))
  satellite.add(satBody)
  const antennaMaterial = satMaterial(0x000000, 0.0)
  const hingeMaterial = satMaterial(0x000000, 0.0)
  // Four antennas of the same length, fixed on the ball's outline 90 degrees apart
  // round its trailing axis, each swept back and a little outward. The whole model is
  // turned slightly so the ring of legs is seen in perspective, not flat on.
  const satModel = new THREE.Group()
  satModel.rotation.set(0.6, 0.45, 0)
  satModel.add(satBody)
  satellite.add(satModel)
  const antennaLength = 7.5
  const spread = 0.2
  for (let i = 0; i < 4; i += 1) {
    const phi = (i * Math.PI) / 2 + Math.PI / 4
    const direction = new THREE.Vector3(
      Math.cos(spread),
      Math.sin(spread) * Math.cos(phi),
      Math.sin(spread) * Math.sin(phi)
    ).normalize()
    const start = new THREE.Vector3(0.3, 0.95 * Math.cos(phi), 0.95 * Math.sin(phi))
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, antennaLength, 5), antennaMaterial)
    rod.position.copy(start).addScaledVector(direction, antennaLength / 2)
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
    satModel.add(rod)
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 8), hingeMaterial)
    hinge.position.copy(start).addScaledVector(direction, 0.1)
    hinge.quaternion.copy(rod.quaternion)
    satModel.add(hinge)
  }
  satellite.visible = false
  const satelliteScene = new THREE.Scene()
  satelliteScene.add(satellite)
  let satelliteOn = 0
  let satelliteFrame = 0
  let satelliteAngle = 1.2
  let satelliteLast = 0
  // The orbit lies in the planet's own space, so it turns with the planet when the
  // planet is dragged round. These are how far the planet is turned from its home view.
  let satTurnYaw = 0
  let satTurnPitch = 0
  const orbitPoint = (x, y, z) => {
    // a slight fixed tilt of the orbit plane, then the planet's turn
    const tilt = 0.2
    let ty = y * Math.cos(tilt) - z * Math.sin(tilt)
    let tz = y * Math.sin(tilt) + z * Math.cos(tilt)
    let tx = x
    const cy = Math.cos(satTurnYaw)
    const sy = Math.sin(satTurnYaw)
    const rx = tx * cy + tz * sy
    let rz = -tx * sy + tz * cy
    const cp = Math.cos(satTurnPitch)
    const sp = Math.sin(satTurnPitch)
    const ry = ty * cp - rz * sp
    rz = ty * sp + rz * cp
    return [rx, ry, rz]
  }
  const placeSatellite = () => {
    const R = GLOBE.radius * planetScale
    const a = R * 1.3
    const [x, y, z] = orbitPoint(Math.cos(satelliteAngle) * a, 0, Math.sin(satelliteAngle) * a)
    const [vx, vy] = orbitPoint(-Math.sin(satelliteAngle) * a, 0, Math.cos(satelliteAngle) * a)
    // In front of the planet (towards the viewer) it crosses the face; behind, it is hidden
    // wherever the planet's disc is.
    satellite.position.set(x, y, 0)
    const depth = 0.85 + 0.2 * (z / a)
    const size = R * 0.015 * depth
    satellite.scale.set(size, size, size)
    // Like a shuttlecock: the ball leads and the antennas trail behind. The model's
    // antennas trail to the right, so when moving right it is turned half round about
    // the vertical axis (never upside down), easing through the turns.
    const speed = Math.hypot(vx, vy) || 1
    const lead = Math.max(-1, Math.min(1, (vx / speed) * 3))
    satellite.rotation.set(
      0,
      (Math.PI / 2) * (1 + lead),
      -Math.max(-0.35, Math.min(0.35, Math.atan2(vy, Math.max(1e-3, Math.abs(vx))) * Math.abs(lead)))
    )
    satShared.uBehind.value = z > 0 ? 0 : 1
    satShared.uRadius.value = R
  }
  const satelliteTick = (time) => {
    satelliteFrame = 0
    if (satelliteOn <= 0.001) return
    const delta = satelliteLast ? Math.min(64, time - satelliteLast) : 16
    satelliteLast = time
    satelliteAngle += delta * 0.00016
    api.render()
    satelliteFrame = window.requestAnimationFrame(satelliteTick)
  }

  const sketchScene = new THREE.Scene()
  sketchScene.add(sketchQuad)
  const pixelScene = new THREE.Scene()
  pixelScene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: pixelUniforms,
        vertexShader: SKETCH_VERTEX,
        fragmentShader: PIXEL_FRAGMENT,
        depthTest: false,
        depthWrite: false,
      })
    )
  )
  const sketchCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  // One scene unit is one pixel of the 1280 x 720 video frame.
  const halfWidth = ZOOM_VIDEO.width / 2
  const halfHeight = ZOOM_VIDEO.height / 2
  const camera = new THREE.OrthographicCamera(
    -halfWidth,
    halfWidth,
    halfHeight,
    -halfHeight,
    // deep, so the planet is not cut when it is made very large
    -100000,
    100000
  )
  camera.position.z = 500

  const scene = new THREE.Scene()
  const scaleUniform = { value: 1 }
  const tilt = new THREE.Group()
  // The video's planet is slightly taller than wide.
  tilt.scale.set(1, GLOBE.verticalStretch, 1)
  scene.add(tilt)

  const texture = await new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(textureUrl, resolve, undefined, reject)
  })
  // Raw colours: the grading below is measured on the video's displayed colours.
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

  // The colour (hazard-map) look of the planet has been taken out: only the line drawing is shown.
  const colorTexture = null
  const colorUniform = { value: 0 }
  // Relief of the land: loaded the first time the colour map is switched on.
  const flatHeight = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
  flatHeight.needsUpdate = true
  const heightUniform = { value: flatHeight }
  let heightTexture = null
  let heightRequested = false
  let peekTexture = null

  // The clip's frames laid onto the planet. A frame was taken with the planet at the home turn,
  // scale s and the view moved by (x, y): a point p of the planet was then at M p - (x, y) on the
  // frame, M being the turn and scale (as three.js composes them: tilt group, then planet).
  const detailUniforms = {}
  const detailTextures = []
  let disposed = false
  // set once `api` below exists (a frame can load before that)
  let apiReady = false
  const detailCode = clipDetails
    .map((_, index) => `
          {
            vec3 w = uDetailM${index} * vObj;
            vec2 f = w.xy - uDetailC${index};
            // frame units from the frame's nearest edge (its bottom rows carry the frame's number)
            float inside = min(min(f.x + 640.0, 640.0 - f.x), min(f.y + 356.0, 360.0 - f.y));
            float facing = w.z / (${GLOBE.radius.toFixed(1)} * uDetailS${index});
            // only once the planet is shown nearly as big as the frame took it: a frame much finer than
            // the view adds nothing but another seam
            float level = smoothstep(uDetailS${index} / 1.8, uDetailS${index} / 1.3, uScale);
            float weight = smoothstep(0.0, 90.0, inside) * smoothstep(0.3, 0.5, facing) * level * uDetailOn${index};
            if (weight > 0.0) {
              vec2 at = vec2((f.x + 640.0) / 1280.0, (f.y + 360.0) / 720.0);
              vec4 seen = texture2D(uDetail${index}, at);
              color = mix(color, seen.rgb, weight);
              // its alpha is where its land is
              land = mix(land, seen.a, weight);
              landSoft = mix(landSoft, texture2D(uDetail${index}, at, 4.5).a, weight);
              blurred = mix(blurred, dot(texture2D(uDetail${index}, at, 4.5).rgb, vec3(0.333)), weight);
              narrow = mix(narrow, dot(texture2D(uDetail${index}, at, 1.5).rgb, vec3(0.333)), weight);
            }
          }`)
    .join('')
  clipDetails.forEach((detail, index) => {
    const turn = new THREE.Matrix4()
      .makeRotationX(HOME_ROTATION.pitch * DEGREES)
      .multiply(new THREE.Matrix4().makeScale(detail.scale, detail.scale * GLOBE.verticalStretch, detail.scale))
      .multiply(new THREE.Matrix4().makeRotationY(HOME_ROTATION.yaw * DEGREES))
    detailUniforms[`uDetail${index}`] = { value: null }
    detailUniforms[`uDetailM${index}`] = { value: new THREE.Matrix3().setFromMatrix4(turn) }
    detailUniforms[`uDetailC${index}`] = { value: new THREE.Vector2(detail.x, detail.y) }
    detailUniforms[`uDetailS${index}`] = { value: detail.scale }
    detailUniforms[`uDetailOn${index}`] = { value: 0 }
  })
  const detailDeclarations = clipDetails
    .map((_, index) => `
        uniform sampler2D uDetail${index};
        uniform mat3 uDetailM${index};
        uniform vec2 uDetailC${index};
        uniform float uDetailS${index};
        uniform float uDetailOn${index};`)
    .join('')

  // Seen aslant, land near the planet's edge is squeezed into a sliver. Round one chosen point the
  // planet is drawn as if seen from straight above instead (a flat patch laid where the point is),
  // easing back to the true sphere further out, so that land keeps its own shape.
  const flatUniforms = {
    uFlat: { value: 0 },
    uFlatCenter: { value: new THREE.Vector3(0, 0, 1) },
    uFlatEast: { value: new THREE.Vector3(1, 0, 0) },
    uFlatNorth: { value: new THREE.Vector3(0, 1, 0) },
  }

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE.radius, 256, 192),
    new THREE.ShaderMaterial({
      uniforms: { map: { value: texture }, mapColor: { value: colorTexture || texture }, mapHeight: heightUniform, uColor: colorUniform, uScale: scaleUniform, ...detailUniforms, ...flatUniforms, ...styleUniforms },
      vertexShader: `
        uniform float uFlat;
        uniform vec3 uFlatCenter;
        uniform vec3 uFlatEast;
        uniform vec3 uFlatNorth;
        varying vec2 vUv;
        varying vec2 vScreen;
        varying vec3 vObj;
        void main() {
          vUv = uv;
          vObj = position;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          if (uFlat > 0.0) {
            float away = acos(clamp(dot(normalize(position), uFlatCenter), -1.0, 1.0));
            float weight = uFlat * (1.0 - smoothstep(0.12, 0.26, away));
            if (weight > 0.0) {
              vec3 middle = (modelViewMatrix * vec4(uFlatCenter * ${GLOBE.radius.toFixed(1)}, 1.0)).xyz;
              vec3 east = (modelViewMatrix * vec4(uFlatEast, 0.0)).xyz;
              vec3 north = (modelViewMatrix * vec4(uFlatNorth, 0.0)).xyz;
              // north keeps its direction on screen, at its full length; east lies square to it
              float size = length(north);
              vec2 up = normalize(north.xy + vec2(0.0, 1e-6));
              vec2 side = vec2(up.y, -up.x);
              if (dot(side, east.xy) < 0.0) side = -side;
              vec2 offset = (dot(position, uFlatEast) * side + dot(position, uFlatNorth) * up) * size;
              // Depth on the far side only: the land towards the planet's edge (further away) narrows
              // and recedes, and keeps more of the planet's own tilt; the near side stays whole.
              vec2 outward = normalize(middle.xy - (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xy + vec2(1e-6, 0.0));
              float along = dot(offset, outward);
              float depth = clamp(along / (size * ${GLOBE.radius.toFixed(1)}), -0.2, 0.2);
              float far = max(depth, 0.0);
              vec2 across = (offset - along * outward) / (1.0 + 3.0 * far);
              offset = across + along * outward / (1.0 + 4.5 * far);
              vec2 onPlane = middle.xy + offset;
              weight *= 1.0 - 0.75 * smoothstep(-0.02, 0.1, depth);
              viewPosition.xy = mix(viewPosition.xy, onPlane, weight);
            }
          }
          // from the planet's own middle, wherever the view has been moved to
          vScreen = viewPosition.xy - (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xy;
          gl_Position = projectionMatrix * viewPosition;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        uniform sampler2D mapColor;
        uniform sampler2D mapHeight;
        uniform float uColor;
        uniform float uScale;${detailDeclarations}
        uniform sampler2D uLand;
        uniform float uLandOn;
        uniform float uStyle;
        uniform float uGrain;
        uniform float uLines;
        varying vec2 vUv;
        varying vec2 vScreen;
        varying vec3 vObj;

        ${STYLE_CODE}

        void main() {
          // The map is already a finished line drawing, so it is shown as it is,
          // with a thin line round the edge of the globe.
          vec3 color = mix(texture2D(map, vUv).rgb, texture2D(mapColor, vUv).rgb, uColor);
          float land = texture2D(uLand, vUv).r;
          float landSoft = texture2D(uLand, vUv, 4.5).r;
          float blurred = dot(texture2D(map, vUv, 4.5).rgb, vec3(0.333));
          float narrow = dot(texture2D(map, vUv, 1.5).rgb, vec3(0.333));
          ${detailCode}
          if (uColor > 0.001) {
            // Relief: how the land's height changes across the screen, lit from the
            // upper left, so ridges catch the light and their far sides go darker.
            vec3 hs = texture2D(mapHeight, vUv).rgb;
            float h = (hs.r * 255.0 * 256.0 + hs.g * 255.0) / 65535.0;
            vec2 slope = vec2(dFdx(h), dFdy(h)) * uScale * 150.0;
            float shade = clamp(dot(slope, vec2(-0.70, 0.72)), -0.3, 0.3);
            // gentle: the light only leans on the relief, and the land is kept bright
            color = color * (1.0 + shade * 0.38 * uColor) + (vec3(1.0) - color) * 0.10 * uColor * step(0.001, h);
          }
          if (uStyle > 0.001 && uLandOn > 0.5) {
            vec3 look = styleLook(normalize(vObj), log2(uGrain), land, landSoft, smoothstep(0.93, 1.0, landSoft), blurred, narrow, dot(color, vec3(0.333)), uLines);
            color = mix(color, look, uStyle);
          }
          // (the planet's outline is drawn once, in the sketch pass: a ring here would grow thick as the
          // planet is made large)
          gl_FragColor = vec4(color, 1.0);
        }`,
    })
  )
  tilt.add(planet)
  // the land map for the textured look (where land is, from the map itself)
  if (landUrl) {
    new THREE.TextureLoader().load(landUrl, (loaded) => {
      if (disposed) {
        loaded.dispose()
        return
      }
      loaded.colorSpace = THREE.NoColorSpace
      loaded.anisotropy = renderer.capabilities.getMaxAnisotropy()
      styleUniforms.uLand.value = loaded
      // sent to the graphics card now, not on the first frame that needs it (which would stall)
      renderer.initTexture?.(loaded)
      styleUniforms.uLandOn.value = 1
      detailTextures.push(loaded)
      if (apiReady) api.render()
    })
  }
  if (clipLandUrl) {
    new THREE.TextureLoader().load(clipLandUrl, (loaded) => {
      if (disposed) {
        loaded.dispose()
        return
      }
      loaded.colorSpace = THREE.NoColorSpace
      loaded.generateMipmaps = false
      loaded.minFilter = THREE.LinearFilter
      sketchUniforms.uClipLand.value = loaded
      // sent to the graphics card now, not on the first frame that needs it (which would stall)
      renderer.initTexture?.(loaded)
      sketchUniforms.uClipLandOn.value = 1
      detailTextures.push(loaded)
      if (apiReady) api.render()
    })
  }
  // the frames load on their own; each shows once it is in
  clipDetails.forEach((detail, index) => {
    new THREE.TextureLoader().load(detail.url, (loaded) => {
      if (disposed) {
        loaded.dispose()
        return
      }
      loaded.colorSpace = THREE.NoColorSpace
      loaded.anisotropy = renderer.capabilities.getMaxAnisotropy()
      loaded.minFilter = THREE.LinearMipmapLinearFilter
      planet.material.uniforms[`uDetail${index}`].value = loaded
      // sent to the graphics card now, not on the first frame that needs it (which would stall)
      renderer.initTexture?.(loaded)
      planet.material.uniforms[`uDetailOn${index}`].value = 1
      detailTextures.push(loaded)
      if (apiReady) api.render()
    })
  })

  // The glow is a full-frame backdrop shaded by distance from the planet's
  // centre, so it can follow the video's falloff exactly; the planet covers it.
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(ZOOM_VIDEO.width, ZOOM_VIDEO.height),
    new THREE.ShaderMaterial({
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: scaleUniform },
      vertexShader: `
        varying vec2 vPosition;
        void main() {
          vPosition = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float uScale;
        varying vec2 vPosition;
        void main() {
          float distance = length(vec2(vPosition.x, vPosition.y / ${GLOBE.verticalStretch.toFixed(4)})) / uScale;
          vec3 falloff = ${vec3(GLOW_FALLOFF)};
          vec3 glow = ${vec3(GLOW_PEAK)} * exp(-(distance - ${GLOW_RADIUS.toFixed(1)}) / falloff);
          gl_FragColor = vec4(min(glow, vec3(1.0)), 1.0);
        }`,
    })
  )
  glow.position.z = -200
  // The line-drawing map has no atmosphere.
  glow.visible = false
  scene.add(glow)

  // ---- The sky -------------------------------------------------------------
  // Drawn first, with its own perspective camera, so it can turn with the planet
  // while the planet itself stays in its flat, video-matched projection.
  renderer.autoClear = false
  const skyCamera = new THREE.PerspectiveCamera(
    GLOBE.skyFieldOfView,
    ZOOM_VIDEO.width / ZOOM_VIDEO.height,
    1,
    1000
  )
  const skyScene = new THREE.Scene()
  // pitch outside yaw, like the planet, so both turn about the same axes.
  const skyPitch = new THREE.Group()
  const skyYaw = new THREE.Group()
  skyPitch.add(skyYaw)
  skyScene.add(skyPitch)
  const skyBase = new THREE.Group()
  skyYaw.add(skyBase)

  let seed = 20260705
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Extra stars scattered evenly over the whole sky, so there are stars to see
  // wherever the planet is turned, not only where the photograph reaches.
  const starCount = GLOBE.starCount
  const starPositions = new Float32Array(starCount * 3)
  const starColors = new Float32Array(starCount * 3)
  const starSizes = new Float32Array(starCount)
  const skyRadius = 500
  for (let index = 0; index < starCount; index += 1) {
    const longitude = random() * Math.PI * 2
    const latitude = Math.asin(random() * 2 - 1)
    starPositions.set(
      [
        Math.cos(latitude) * Math.cos(longitude) * skyRadius,
        Math.sin(latitude) * skyRadius,
        Math.cos(latitude) * Math.sin(longitude) * skyRadius,
      ],
      index * 3
    )
    const brightness = 0.3 + random() ** 1.8 * 0.7
    const tint = random()
    // Mostly white, some cool blue and a few warm stars.
    const color =
      tint < 0.18 ? [0.75, 0.85, 1] : tint > 0.9 ? [1, 0.86, 0.72] : [1, 1, 1]
    starColors.set(color.map((channel) => channel * brightness), index * 3)
    // A few bright stars with a visible halo; the rest are pin-points.
    starSizes[index] = random() < 0.004 ? 5 + random() * 3 : 1.3 + random() * 1.5
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))
  starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))
  const starMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      uniform float uPixelRatio;
      varying vec3 vColor;
      void main() {
        vColor = color;
        gl_PointSize = size * uPixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float distance = length(gl_PointCoord - vec2(0.5)) * 2.0;
        float falloff = pow(clamp(1.0 - distance, 0.0, 1.0), 1.6);
        gl_FragColor = vec4(vColor * falloff, 1.0);
      }`,
  })
  skyBase.add(new THREE.Points(starGeometry, starMaterial))

  // The Milky Way: the supplied photograph on a patch of the sky sphere, faded
  // to black towards its edges so it melts into the dark sky around it.
  const milkyWay = GLOBE.milkyWay
  const milkyWayTexture = await new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(milkyWayUrl, resolve, undefined, reject)
  })
  milkyWayTexture.colorSpace = THREE.NoColorSpace
  milkyWayTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const patches = []
  const addMilkyWayPatch = (milkyWay, milkyWayTexture) => {
    // Drawn at half the size they were first given.
    const spanX = milkyWay.spanDegrees * 0.5 * DEGREES
    const spanY = spanX * (milkyWay.height / milkyWay.width)
    const patchColumns = 40
    const patchRows = 72
    const patchPositions = []
    const patchUvs = []
    const patchIndices = []
    for (let row = 0; row <= patchRows; row += 1) {
      for (let column = 0; column <= patchColumns; column += 1) {
        const u = column / patchColumns
        const v = row / patchRows
        const azimuth = (u - 0.5) * spanX
        const elevation = (v - 0.5) * spanY
        // The camera looks down -Z; u runs left to right, v bottom to top.
        patchPositions.push(
          Math.cos(elevation) * Math.sin(azimuth) * skyRadius,
          Math.sin(elevation) * skyRadius,
          -Math.cos(elevation) * Math.cos(azimuth) * skyRadius
        )
        patchUvs.push(u, v)
      }
    }
    for (let row = 0; row < patchRows; row += 1) {
      for (let column = 0; column < patchColumns; column += 1) {
        const a = row * (patchColumns + 1) + column
        const b = a + 1
        const c = a + patchColumns + 1
        const d = c + 1
        patchIndices.push(a, c, b, b, c, d)
      }
    }
    const patchGeometry = new THREE.BufferGeometry()
    patchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(patchPositions, 3))
    patchGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(patchUvs, 2))
    patchGeometry.setIndex(patchIndices)
    const patchMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { map: { value: milkyWayTexture } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec2 vUv;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float valueNoise(vec2 p) {
          vec2 cell = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
            mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }
        void main() {
          // Photo pixels, measured from the middle in units of half its height.
          vec2 q = (vUv - 0.5) * vec2(${(milkyWay.width / milkyWay.height).toFixed(4)}, 1.0) * 2.0;
          float angle = ${(milkyWay.bandAngle * DEGREES).toFixed(5)};
          vec2 along = vec2(sin(angle), cos(angle));
          vec2 across = vec2(cos(angle), -sin(angle));
          vec2 ellipse = vec2(dot(q, along) / ${milkyWay.bandLength.toFixed(3)}, dot(q, across) / ${milkyWay.bandWidth.toFixed(3)});
          // A ragged edge: the radius at which the glow ends wanders with the noise.
          float wander = (valueNoise(q * 3.2) * 0.65 + valueNoise(q * 7.5 + 4.0) * 0.35 - 0.5) * 2.0;
          float radius = length(ellipse) + wander * ${milkyWay.edgeWander.toFixed(3)};
          float mask = 1.0 - smoothstep(${milkyWay.solidRadius.toFixed(3)}, 1.0, radius);
          mask = mask * mask * (3.0 - 2.0 * mask);
          // Take off the photo's sky level so the dark between the stars stays black.
          vec3 color = max(texture2D(map, vUv).rgb - vec3(${milkyWay.blackLevel.toFixed(3)}), 0.0) / (1.0 - ${milkyWay.blackLevel.toFixed(3)});
          gl_FragColor = vec4(color * mask * ${milkyWay.brightness.toFixed(3)}, 1.0);
        }`,
    })
    const patch = new THREE.Mesh(patchGeometry, patchMaterial)
    // Aim the patch: azimuth turns it about the vertical axis, elevation tips it up.
    const patchAim = new THREE.Group()
    patchAim.rotation.order = 'YXZ'
    patchAim.rotation.y = -milkyWay.centerAzimuth * DEGREES
    patchAim.rotation.x = milkyWay.centerElevation * DEGREES
    patchAim.add(patch)
    skyBase.add(patchAim)
    patches.push({ geometry: patchGeometry, material: patchMaterial })
  }
  addMilkyWayPatch(milkyWay, milkyWayTexture)
  // A second photograph of the Milky Way, laid out the same way on the other side.
  let milkyWayTexture2 = null
  if (GLOBE.milkyWay2) {
    milkyWayTexture2 = await new Promise((resolve) => {
      new THREE.TextureLoader().load(
        milkyWayUrl.replace(/milky-way\.webp$/, 'milky-way-2.webp'),
        resolve,
        undefined,
        () => resolve(null)
      )
    })
    if (milkyWayTexture2) {
      milkyWayTexture2.colorSpace = THREE.NoColorSpace
      milkyWayTexture2.anisotropy = renderer.capabilities.getMaxAnisotropy()
      addMilkyWayPatch({ ...milkyWay, ...GLOBE.milkyWay2 }, milkyWayTexture2)
    }
  }
  // The same two photographs again further round the sky, turned and re-sized, so
  // every side of the sphere has a Milky Way.
  const wider = [
    [milkyWay, { centerAzimuth: 95, centerElevation: 8, bandAngle: 30, spanDegrees: 15, brightness: 0.85 }],
    [milkyWayTexture2 && { ...milkyWay, ...GLOBE.milkyWay2 }, { centerAzimuth: 150, centerElevation: -10, bandAngle: -35, spanDegrees: 16, brightness: 0.85 }],
    [milkyWay, { centerAzimuth: -100, centerElevation: -6, bandAngle: -20, spanDegrees: 16, brightness: 0.85 }],
    [milkyWayTexture2 && { ...milkyWay, ...GLOBE.milkyWay2 }, { centerAzimuth: -150, centerElevation: 12, bandAngle: 25, spanDegrees: 15, brightness: 0.8 }],
    [milkyWay, { centerAzimuth: 55, centerElevation: -30, bandAngle: 55, spanDegrees: 13, brightness: 0.8 }],
    [milkyWayTexture2 && { ...milkyWay, ...GLOBE.milkyWay2 }, { centerAzimuth: -62, centerElevation: 28, bandAngle: -50, spanDegrees: 13, brightness: 0.8 }],
  ]
  wider.forEach(([base, override], index) => {
    if (!base) return
    addMilkyWayPatch({ ...base, ...override }, index % 2 === 0 ? milkyWayTexture : milkyWayTexture2)
  })

  // ---- Galaxies and bright stars, as in an astronomical negative ---------------
  // Each galaxy is a small picture drawn in the red channel only (a bright core, a
  // halo and spiral arms), so the sketch pass can tell it from the white stars and
  // ink it as a dark ellipse with a dotted halo.
  const smoothLane = (u) => Math.min(1, Math.max(0, 1 - Math.abs(u) / 0.8))
  // Shaped after a photograph of the Andromeda galaxy: a long tilted disc with a
  // bright core, rings of spiral arms, a dark dust lane along the near edge and two
  // small companion galaxies. Drawn in the red channel only (the sketch pass inks it).
  const makeGalaxyTexture = (arms, tightness, seed0) => {
    const size = 384
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx2d = canvas.getContext('2d')
    const image = ctx2d.createImageData(size, size)
    let t = seed0
    const rnd = () => {
      t = (t * 1664525 + 1013904223) >>> 0
      return t / 4294967296
    }
    const flip = seed0 % 2 === 0 ? 1 : -1
    const tilt = (-32 + (seed0 % 5) * 3) * (Math.PI / 180)
    const cos = Math.cos(tilt)
    const sin = Math.sin(tilt)
    const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-((x - cx) ** 2 / (2 * sx * sx) + (y - cy) ** 2 / (2 * sy * sy)))
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx0 = (x - size / 2) / (size / 2)
        const dy0 = (y - size / 2) / (size / 2)
        // rotate into the disc's own axes: u along the long axis, v across it
        const u = dx0 * cos + dy0 * sin
        const v = (-dx0 * sin + dy0 * cos) * flip
        const radius = Math.hypot(u / 0.9, v / 0.3)
        const angle = Math.atan2(v / 0.3, u / 0.9)
        const core = gauss(u, v, 0, 0, 0.035, 0.014) * 1.3 + gauss(u, v, 0, 0, 0.15, 0.06) * 0.6
        const halo = Math.exp(-radius * 2.2) * 0.5
        const rings =
          (0.5 + 0.5 * Math.cos(arms * angle - tightness * Math.log(radius + 0.06))) *
          Math.exp(-Math.pow((radius - 0.5) / 0.28, 2)) *
          0.55
        const grain = 0.75 + 0.5 * rnd()
        // dust lane: a thin dark band along the lower edge of the bright disc
        const lane = 1 - 0.8 * Math.exp(-Math.pow((v - 0.07) / 0.014, 2)) * smoothLane(u)
        // companions: a round one near the core, an oval one further out
        const m32 = gauss(u, v, -0.2, -0.1, 0.022, 0.02) * 0.95
        const m110 = gauss(u, v, 0.32, 0.4, 0.07, 0.034) * 0.55
        const edge = Math.max(0, 1 - Math.pow(radius, 4))
        const value = Math.min(1, ((core + halo + rings * grain) * lane) * edge + m32 + m110)
        const index = (y * size + x) * 4
        image.data[index] = Math.round(255 * Math.max(0, value))
        image.data[index + 3] = 255
      }
    }
    ctx2d.putImageData(image, 0, 0)
    // a soft focus, so the arms and the lane blend into the glow
    const soft = document.createElement('canvas')
    soft.width = size
    soft.height = size
    const softCtx = soft.getContext('2d')
    softCtx.filter = 'blur(1.4px)'
    softCtx.drawImage(canvas, 0, 0)
    const texture = new THREE.CanvasTexture(soft)
    texture.colorSpace = THREE.NoColorSpace
    return texture
  }
  const skyObjects = []
  const meteors = []
  const placeOnSky = (texture, azimuthDeg, elevationDeg, widthUnits, heightUnits, rollDeg) => {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthUnits, heightUnits), material)
    const azimuth = azimuthDeg * DEGREES
    const elevation = elevationDeg * DEGREES
    mesh.position.set(
      Math.cos(elevation) * Math.sin(azimuth) * skyRadius * 0.97,
      Math.sin(elevation) * skyRadius * 0.97,
      -Math.cos(elevation) * Math.cos(azimuth) * skyRadius * 0.97
    )
    mesh.lookAt(0, 0, 0)
    mesh.rotateZ(rollDeg * DEGREES)
    skyBase.add(mesh)
    skyObjects.push(mesh)
  }
  // [azimuth, elevation, width, height, roll, arms, tightness, seed]; one world unit
  // is about two pixels of the frame at the home view.
  // Galaxies and the Milky Way patches are drawn at half their first size.
  const SKY_OBJECT_SCALE = 0.25
  const galaxies = [
    [-6, 17, 64, 64, 20, 2, 5.5, 11],
    [7, -17, 56, 56, -25, 2, 4.5, 23],
    [-12, 3, 44, 44, 150, 2, 5.5, 53],
    [-22, 12, 70, 70, 15, 2, 5.5, 71],
    [30, 14, 46, 46, 160, 2, 5.5, 101],
    [60, 30, 60, 60, -35, 2, 6, 127],
    [85, -12, 58, 58, 20, 2, 5.5, 131],
    [105, 22, 62, 62, -30, 2, 5, 137],
    [125, -25, 52, 52, 140, 2, 6, 139],
    [150, 8, 66, 66, 10, 2, 5.5, 149],
    [172, -18, 50, 50, -50, 2, 5, 151],
    [-60, 10, 60, 60, 35, 2, 5.5, 157],
    [-82, -22, 54, 54, -20, 2, 6, 163],
    [-105, 18, 64, 64, 160, 2, 5, 167],
    [-130, -8, 56, 56, 70, 2, 5.5, 173],
    [-155, 26, 50, 50, -15, 2, 6, 179],
    [-178, -28, 62, 62, 120, 2, 5, 181],
    [40, -38, 52, 52, 15, 2, 5.5, 191],
    [-40, 40, 56, 56, -40, 2, 5.5, 193],
    [-75, 42, 48, 48, 100, 2, 6, 197],
    [130, 45, 54, 54, -10, 2, 5, 199],
  ]
  // The galaxies are switched off for now (the list is kept for later).
  const SHOW_GALAXIES = false
  for (const [az, el, gw, gh, roll, arms, tight, seed] of SHOW_GALAXIES ? galaxies : []) {
    placeOnSky(makeGalaxyTexture(arms, tight, seed), az, el, gw * SKY_OBJECT_SCALE, gh * SKY_OBJECT_SCALE, roll)
  }

  // ---- Fine detail from the negatives: soft smudges, meteor trails -----
  // All drawn in the red channel like the galaxies, so the sketch pass stipples them.
  const makeRedTexture = (width, height, valueAt) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx2d = canvas.getContext('2d')
    const image = ctx2d.createImageData(width, height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = Math.min(1, Math.max(0, valueAt(x / (width - 1), y / (height - 1))))
        const index = (y * width + x) * 4
        image.data[index] = Math.round(255 * value)
        image.data[index + 3] = 255
      }
    }
    ctx2d.putImageData(image, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.NoColorSpace
    return texture
  }
  const makeNoise = (seed0, cells) => {
    let t = seed0
    const values = new Float32Array(cells * cells)
    for (let i = 0; i < values.length; i += 1) {
      t = (t * 1664525 + 1013904223) >>> 0
      values[i] = t / 4294967296
    }
    const at = (x, y) => values[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)]
    return (x, y) => {
      const x0 = Math.floor(x)
      const y0 = Math.floor(y)
      const fx = x - x0
      const fy = y - y0
      const sx = fx * fx * (3 - 2 * fx)
      const sy = fy * fy * (3 - 2 * fy)
      return (
        (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) +
        (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy
      )
    }
  }
  // A long, soft, grainy smear, like the faint streaks of the second negative.
  const makeSmudgeTexture = (seed0, strength, tapered) => {
    const n = makeNoise(seed0, 32)
    return makeRedTexture(256, 64, (u, v) => {
      const dx = u * 2 - 1
      const dy = v * 2 - 1
      const spread = tapered ? 0.25 + 0.45 * u : 0.45
      const body = Math.exp(-(dx * dx) / 0.5 - (dy * dy) / (spread * spread))
      return body * strength * (0.65 + 0.7 * n(u * 22, v * 6))
    })
  }
  // A meteor trail: a dark head, a line that thins and fades into a faint tail.
  const makeStreakTexture = () =>
    makeRedTexture(512, 16, (u, v) => {
      const dy = Math.abs(v * 2 - 1)
      const width = 0.12 + 0.55 * Math.pow(1 - u, 1.4)
      const across = Math.max(0, 1 - Math.pow(dy / Math.max(0.12, width), 2))
      const along = u < 0.12 ? u / 0.12 : Math.pow(1 - (u - 0.12) / 0.88, 1.15)
      return across * Math.max(0, along) * 1.05
    })

  // [kind, azimuth, elevation, width, height, roll, seed, strength]
  const details = [
    ['smudge', 18, -2, 46, 12, 62, 401, 0.4, true],
    ['smudge', 25, -9, 54, 13, 62, 411, 0.36, true],
    ['smudge', 8, 14, 40, 10, 62, 421, 0.32, true],
    ['smudge', -16, -14, 50, 12, 62, 431, 0.38, true],
    ['smudge', 40, 6, 44, 11, 62, 441, 0.3, true],
    ['smudge', 3, -11, 36, 10, 62, 451, 0.3, true],
    ['smudge', 70, 4, 46, 11, 62, 471, 0.32, true],
    ['smudge', 118, 14, 44, 11, 62, 481, 0.3, true],
    ['smudge', 165, -8, 48, 12, 62, 491, 0.34, true],
    ['smudge', -70, -6, 46, 11, 62, 501, 0.32, true],
    ['smudge', -120, 6, 44, 11, 62, 511, 0.3, true],
    ['smudge', -165, -12, 48, 12, 62, 521, 0.34, true],
    ['smudge', -3, 24, 120, 60, 128, 461, 0.13, false],
    ['streak', 12, 15, 52, 3.4, 35, 0, 1],
    ['streak', -9, -9, 34, 2.4, 35, 0, 1],
    ['streak', 27, 20, 40, 2.6, 35, 0, 1],
    ['streak', 80, 10, 44, 3, 35, 0, 1],
    ['streak', 130, -14, 38, 2.6, 35, 0, 1],
    ['streak', 175, 18, 46, 3, 35, 0, 1],
    ['streak', -60, 16, 40, 2.8, 35, 0, 1],
    ['streak', -110, -12, 44, 3, 35, 0, 1],
    ['streak', -150, 8, 38, 2.6, 35, 0, 1],
    ['streak', -30, 34, 42, 2.8, 35, 0, 1],
    ['streak', 50, -30, 40, 2.8, 35, 0, 1],
    ['streak', -5, 28, 44, 3, 35, 0, 1],
    ['streak', 105, -22, 40, 2.8, 35, 0, 1],
    ['streak', -135, 22, 42, 3, 35, 0, 1],
    ['streak', 20, -38, 38, 2.6, 35, 0, 1],
  ]
  // The soft smudges are off too; the shooting stars stay.
  for (const [kind, az, el, dw, dh, roll, seed, strength, tapered] of details.filter((d) => d[0] === 'streak')) {
    const texture =
      kind === 'smudge' ? makeSmudgeTexture(seed, strength, tapered) : makeStreakTexture()
    placeOnSky(texture, az, el, dw, dh, roll)
    if (kind === 'streak') {
      const mesh = skyObjects[skyObjects.length - 1]
      mesh.material.opacity = 0
      mesh.visible = false
      meteors.push({
        mesh,
        basePosition: mesh.position.clone(),
        baseQuaternion: mesh.quaternion.clone(),
        period: 6200 + (meteors.length % 5) * 1700,
        offset: meteors.length * 1700,
        seed: meteors.length * 7 + 3,
      })
    }
  }
  // Shooting stars fall for about a second every few seconds, head first, each time
  // along a slightly different line.
  const updateMeteors = (nowMs) => {
    for (const meteor of meteors) {
      const cycle = Math.floor((nowMs + meteor.offset) / meteor.period)
      const phase = ((nowMs + meteor.offset) % meteor.period) / 1100
      const live = phase >= 0 && phase < 1
      meteor.mesh.visible = live
      if (!live) continue
      const jitter = (n) => Math.sin(cycle * 12.9898 + meteor.seed * 78.233 + n) * 0.5 + 0.5
      meteor.mesh.position.copy(meteor.basePosition)
      meteor.mesh.quaternion.copy(meteor.baseQuaternion)
      meteor.mesh.translateY((jitter(1) - 0.5) * 160)
      meteor.mesh.translateX(70 - phase * 170 + (jitter(2) - 0.5) * 120)
      meteor.mesh.material.opacity = Math.sin(Math.PI * phase) ** 0.7
    }
  }

  // Redraw while a shooting star is falling (the satellite loop already redraws).
  let meteorFrame = 0
  let meteorStopped = false
  const meteorTick = () => {
    if (meteorStopped) return
    updateMeteors(performance.now())
    const sky = sketchUniforms.uSkyOn.value > 0.5 && sketchUniforms.uGlobeMix.value > 0.5
    if (sky && !satelliteFrame && meteors.some((meteor) => meteor.mesh.visible)) api.render()
    meteorFrame = window.requestAnimationFrame(meteorTick)
  }
  meteorFrame = window.requestAnimationFrame(meteorTick)

  const api = {
    setSize(width, height) {
      renderer.setSize(width, height, false)
      const buffer = renderer.getDrawingBufferSize(new THREE.Vector2())
      sketchTarget.setSize(buffer.x, buffer.y)
      pixelTarget.setSize(buffer.x, buffer.y)
      pixelUniforms.uResolution.value.set(buffer.x, buffer.y)
      // pixels of about a screen pixel's size (the smallest the screen can show)
      pixelUniforms.uPixel.value = Math.max(1, Math.round(0.625 * renderer.getPixelRatio()))
      styleUniforms.uPixel.value = pixelUniforms.uPixel.value
      sketchUniforms.uPixel.value = pixelUniforms.uPixel.value
      maskTarget.setSize(buffer.x, buffer.y)
      sketchUniforms.uResolution.value.set(buffer.x, buffer.y)
      syncPlanet()
      syncVideoPlanet()
      // Stars stay a similar size on screen when the frame is scaled up.
      starMaterial.uniforms.uPixelRatio.value =
        renderer.getPixelRatio() * Math.max(1, width / ZOOM_VIDEO.width) ** 0.7
    },
    // 1 is the size of the video's first frame; smaller shows the planet from
    // further away.
    setScale(scale) {
      tilt.scale.set(scale, scale * GLOBE.verticalStretch, scale)
      scaleUniform.value = scale
      planetScale = scale
      syncPlanet()
    },
    // The clip's frame canvas, drawn into the same sketch once the planet has
    // dissolved. `mix` is how much of the planet is still showing (1 = all).
    setVideoSource(canvas) {
      videoTexture?.dispose()
      videoTexture = new THREE.CanvasTexture(canvas)
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.generateMipmaps = false
      sketchUniforms.uVideo.value = videoTexture
    },
    // 1 draws the planet at full size; a little less pulls its rim in.
    setLimbRatio(ratio) {
      sketchUniforms.uLimbRatio.value = Math.min(1, Math.max(0.5, ratio))
    },
    // The clip's planet in the frame on screen ([centre x, centre y, half-width,
    // half-height] as fractions of the width), or nothing once the planet fills the
    // frame and no space is left to replace.
    setVideoPlanet(entry) {
      videoPlanet = entry || null
      syncVideoPlanet()
    },
    // The Grid and World layers of the page's layer list.
    setLayers({ grid = true, world = true } = {}) {
      sketchUniforms.uGridOn.value = grid ? 1 : 0
      sketchUniforms.uWorldOn.value = world ? 1 : 0
    },
    // How much of the sky's stars is kept over the clip (1 = all).
    setStarsAmount(amount) {
      sketchUniforms.uStarsOn.value = Math.min(1, Math.max(0, amount))
    },
    setGlobeMix(mix, skyOn = 1) {
      sketchUniforms.uGlobeMix.value = Math.min(1, Math.max(0, mix))
      sketchUniforms.uSkyOn.value = skyOn
    },
    // 1 draws the sketch, 0 the real picture.
    setSketchAmount(amount) {
      sketchUniforms.uAmount.value = Math.min(1, Math.max(0, amount))
    },
    // yaw / pitch in degrees. The sky follows the planet's turn from the home view.
    setRotation(yaw, pitch) {
      satTurnYaw = (yaw - HOME_ROTATION.yaw) * DEGREES
      satTurnPitch = (pitch - HOME_ROTATION.pitch) * DEGREES
      planet.rotation.y = yaw * DEGREES
      tilt.rotation.x = pitch * DEGREES
      planetPitch = pitch
      syncPlanet()
      skyYaw.rotation.y = (yaw - HOME_ROTATION.yaw) * GLOBE.skyFollow * DEGREES
      skyPitch.rotation.x = (pitch - HOME_ROTATION.pitch) * GLOBE.skyFollow * DEGREES
    },
    // Hold a point of the planet (degrees east / north) at the middle of the frame: `amount` 0 leaves the
    // view on the planet's middle, 1 has moved it all the way. The planet's edge follows (see syncPlanet).
    // (offsetX, offsetY): where on the frame the point is held instead of the middle (scene units)
    setFocus(longitude, latitude, amount, offsetX = 0, offsetY = 0) {
      focusPoint = amount > 0.0001 ? { longitude, latitude, amount, offsetX, offsetY } : null
    },
    // How much the land round (longitude, latitude) is shown flat, as if from straight above (0 to 1).
    setFlat(amount, longitude, latitude) {
      flatUniforms.uFlat.value = Math.min(1, Math.max(0, amount))
      const phi = ((longitude + 180) / 360) * Math.PI * 2
      const theta = ((90 - latitude) / 180) * Math.PI
      flatUniforms.uFlatCenter.value.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta))
      flatUniforms.uFlatNorth.value.set(Math.cos(phi) * Math.cos(theta), Math.sin(theta), -Math.sin(phi) * Math.cos(theta))
      flatUniforms.uFlatEast.value.set(Math.sin(phi), 0, Math.cos(phi))
    },
    // 1 draws the planet in the textured look (see surfaceStyle), 0 as the line map
    setStyle(amount) {
      styleUniforms.uStyle.value = Math.min(1, Math.max(0, amount))
      sketchUniforms.uStyle.value = styleUniforms.uStyle.value
      pixelUniforms.uOn.value = styleUniforms.uStyle.value > 0.5 ? 1 : 0
    },
    // How much of the map's fine lines the textured planet draws (0 to 1).
    setLines(amount) {
      styleUniforms.uLines.value = Math.min(1, Math.max(0, amount))
    },
    // Where the clip's view is on the ground: planet scale, view moved by (x, y) (frame units, y up),
    // which frame's land picture to use (0 = frame 120), or all land (past the clip's end).
    setClipView({ scale, x, y, cell, allLand }) {
      sketchUniforms.uClipScale.value = scale
      sketchUniforms.uClipCenter.value.set(x, y)
      const index = Math.min(80, Math.max(0, Math.round(cell)))
      sketchUniforms.uClipCell.value.set((index % 9) / 9, 1 - (Math.floor(index / 9) + 1) / 9)
      sketchUniforms.uClipAllLand.value = allLand ? 1 : 0
    },
    // 1 turns the space round the planet dark
    setSpace(amount) {
      sketchUniforms.uSpace.value = Math.min(1, Math.max(0, amount))
    },
    render() {
      if (focusPoint) {
        const phi = ((focusPoint.longitude + 180) / 360) * Math.PI * 2
        const theta = ((90 - focusPoint.latitude) / 180) * Math.PI
        const point = new THREE.Vector3(
          -GLOBE.radius * Math.cos(phi) * Math.sin(theta),
          GLOBE.radius * Math.cos(theta),
          GLOBE.radius * Math.sin(phi) * Math.sin(theta)
        )
        scene.updateMatrixWorld(true)
        point.applyMatrix4(planet.matrixWorld)
        focusShift.x = point.x * focusPoint.amount - focusPoint.offsetX
        focusShift.y = point.y * focusPoint.amount - focusPoint.offsetY
      } else {
        focusShift.x = 0
        focusShift.y = 0
      }
      camera.position.x = focusShift.x
      camera.position.y = focusShift.y
      syncPlanet()
      canvasNode.dataset.focus = `${focusShift.x.toFixed(1)} ${focusShift.y.toFixed(1)}`
      // The page reads this to keep hand-drawn marks pinned to the land.
      canvasNode.dataset.planet = `${planetScale} ${planet.rotation.y / DEGREES} ${tilt.rotation.x / DEGREES}`
      updateMeteors(performance.now())
      if (videoPlanetFraction > 0 && sketchUniforms.uGlobeMix.value > 0.001) {
        // The 3D planet's rim sits exactly on the clip's.
        sketchUniforms.uLimbRatio.value = Math.min(
          1,
          Math.max(0.5, (videoPlanetFraction * sketchUniforms.uResolution.value.x) / sketchUniforms.uPlanet.value.x)
        )
      }
      const sketched = sketchUniforms.uAmount.value > 0.001
      const showsPlanet = sketchUniforms.uGlobeMix.value > 0.001 || !videoTexture
      if (videoTexture && sketchUniforms.uGlobeMix.value < 0.999) videoTexture.needsUpdate = true
      if (sketched && sketchUniforms.uColorOn.value > 0.5 && showsPlanet) {
        renderer.setRenderTarget(maskTarget)
        renderer.setClearColor(0x000000, 1)
        renderer.clear()
        renderer.clearDepth()
        scene.overrideMaterial = maskMaterial
        renderer.render(scene, camera)
        scene.overrideMaterial = null
      }
      renderer.setRenderTarget(sketched ? sketchTarget : null)
      renderer.clear()
      if (showsPlanet || sketchUniforms.uStarsOn.value > 0.001) {
        renderer.render(skyScene, skyCamera)
      }
      if (showsPlanet) {
        renderer.clearDepth()
        renderer.render(scene, camera)
      }
      const pixelArt = sketched && pixelUniforms.uOn.value > 0.5
      if (sketched) {
        renderer.setRenderTarget(pixelArt ? pixelTarget : null)
        renderer.clear()
        renderer.render(sketchScene, sketchCamera)
      }
      if (satelliteOn > 0.001) {
        satShared.uAlpha.value = satelliteOn
        renderer.clearDepth()
        satellite.visible = true
        placeSatellite()
        renderer.setRenderTarget(pixelArt ? pixelTarget : null)
        renderer.render(satelliteScene, camera)
      }
      if (pixelArt) {
        renderer.setRenderTarget(null)
        renderer.clear()
        renderer.render(pixelScene, sketchCamera)
      }
    },
    // 0 hides the satellite; above 0 it orbits (and is faded by that amount).
    setSatellite(amount) {
      satelliteOn = Math.min(1, Math.max(0, amount))
      if (satelliteOn > 0.001 && !satelliteFrame) {
        satelliteLast = 0
        satelliteFrame = window.requestAnimationFrame(satelliteTick)
      }
    },
    dispose() {
      disposed = true
      detailTextures.forEach((detail) => detail.dispose())
      if (satelliteFrame) window.cancelAnimationFrame(satelliteFrame)
      satellite.traverse((part) => {
        part.geometry?.dispose()
        part.material?.dispose()
      })
      texture.dispose()
      planet.geometry.dispose()
      planet.material.dispose()
      glow.geometry.dispose()
      glow.material.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
      milkyWayTexture.dispose()
      for (const mesh of skyObjects) {
        mesh.geometry.dispose()
        mesh.material.map?.dispose()
        mesh.material.dispose()
      }
      milkyWayTexture2?.dispose()
      colorTexture?.dispose()
      heightTexture?.dispose()
      peekTexture?.dispose()
      window.cancelAnimationFrame(meteorFrame)
      meteorStopped = true
      for (const entry of patches) {
        entry.geometry.dispose()
        entry.material.dispose()
      }
      videoTexture?.dispose()
      sketchTarget.dispose()
      pixelTarget.dispose()
      maskTarget.dispose()
      sketchQuad.geometry.dispose()
      sketchQuad.material.dispose()
      renderer.dispose()
    },
  }
  apiReady = true
  return api
}
