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
  uniform vec2 uVideoPlanet;
  uniform float uSkyOn;
  uniform float uLimbRatio;
  uniform float uStarsOn;
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
    vec2 rel = (uv * uResolution - 0.5 * uResolution) / uPlanet;
    float r = length(rel);
    if (uLimbRatio < 0.9999 && r > 0.45) {
      float edge = uLimbRatio;
      float mapped = r < edge
        ? 0.45 + (r - 0.45) * (1.0 - 0.45) / (edge - 0.45)
        : 1.0 + (r - edge);
      uv = (rel * (mapped / r) * uPlanet + 0.5 * uResolution) / uResolution;
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

  // The planet the sketch is drawn around: the 3D one, or none at all when only the
  // sky is wanted.
  vec2 gPlanet = vec2(1.0);

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

    vec2 rel = (vUv * uResolution - 0.5 * uResolution) / gPlanet;

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
    inkAmount = max(inkAmount, sky * max(cloudDots, step(0.5, star) * star));

    // Galaxies are drawn in the red channel only: a solid dark core, then a dotted halo
    // whose density follows the picture, and the spiral arms come out as dark dashes.
    float redOnly = clamp(here.r - 0.5 * (here.g + here.b), 0.0, 1.0);
    float galaxy = pow(smoothstep(0.03, 0.95, redOnly), 1.7) * uSkyOn * smoothstep(1.02, 1.12, length(rel));
    float galaxyDots = step(dotRand, galaxy * 1.3) * (0.28 + 0.6 * smoothstep(0.3, 0.85, redOnly));
    float galaxyCore = smoothstep(0.88, 0.98, redOnly) * uSkyOn;
    inkAmount = max(inkAmount, max(galaxyDots, galaxyCore) * (1.0 - step(1.0, sky) * 0.0));


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
    float planetLum = dot(src(vUv, k), vec3(0.333));
    float planetInk = 1.0 - smoothstep(0.1, 0.97, planetLum);
    color = mix(color, mix(paper, ink, planetInk), inPlanet);
    inkAmount = mix(inkAmount, planetInk, inPlanet);

    // World layer off: the planet (or the clip) is not drawn, only the sheet.
    if (uWorldOn < 0.5) {
      float hide = k > 0.5 ? 1.0 : step(dot(rel, rel), 1.03);
      color = mix(color, paper, hide);
      inkAmount = mix(inkAmount, 0.0, hide);
    }

    // ---- the drafting sheet: + marks on a grid, and a thin frame ---------------------------
    float grid = 120.0 * s;
    vec2 cellPos = (floor(px / grid) + 0.5) * grid;
    vec2 off = abs(px - cellPos);
    float arm = 4.5 * s;
    float thin = 0.6 * s;
    float plus = max(step(off.x, thin) * step(off.y, arm), step(off.y, thin) * step(off.x, arm));
    color = mix(color, vec3(0.45), plus * 0.7 * (1.0 - inkAmount) * uGridOn);

    float inset = 16.0 * s;
    vec2 edgeDist = min(px, uResolution - px);
    float frame = step(abs(min(edgeDist.x, edgeDist.y) - inset), 0.7 * s)
      * step(inset - 1.0, min(edgeDist.x, edgeDist.y)) ;
    color = mix(color, ink, frame * 0.9 * uGridOn);

    return color;
  }

  void main() {
    gPlanet = uPlanet;
    vec3 sceneColor = uGlobeMix > 0.001 ? draw(0.0) : vec3(0.0);
    // The clip is already a finished line drawing on the same paper, so it is shown
    // as it is, except for the space round its planet: that is the 3D scene's own
    // sky (still, with its stars, galaxies and grid), so the background does not
    // zoom with the clip.
    vec3 videoColor = vec3(0.0);
    if (uGlobeMix < 0.999) {
      videoColor = texture2D(uVideo, vUv).rgb;
      if (uVideoPlanet.x > 0.0 && uStarsOn > 0.001) {
        vec2 rv = (vUv * uResolution - 0.5 * uResolution) / uVideoPlanet;
        float beyond = (length(rv) - 1.0) * uVideoPlanet.x;
        float s = uResolution.x / 1920.0;
        float outside = smoothstep(8.0 * s, 18.0 * s, beyond);
        if (outside > 0.001) {
          gPlanet = vec2(0.001);
          videoColor = mix(videoColor, draw(0.0), outside);
        }
      }
    }
    gl_FragColor = vec4(mix(videoColor, sceneColor, uGlobeMix), 1.0);
  }
`

const vec3 = (values) => `vec3(${values.map((value) => value.toFixed(4)).join(', ')})`

// Builds the planet in a three.js scene that matches the zoom video's first
// frame. three.js is imported lazily so it never loads on the server.
export async function createGlobe(canvasNode, textureUrl, milkyWayUrl) {
  const THREE = await import('three')

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasNode,
    antialias: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  // Opaque black, like the video's own background.
  renderer.setClearColor(0x000000, 1)

  const sketchTarget = new THREE.WebGLRenderTarget(2, 2, { samples: 4 })
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
    uGridOn: { value: 1 },
    uWorldOn: { value: 1 },
    // Half-axes in pixels of the planet's outline (centred in the frame); drawn
    // straight from the map instead of being redrawn as a sketch.
    uPlanet: { value: new THREE.Vector2(1, 1) },
    // Half-axes in pixels of the clip's own planet (0 = it fills the frame).
    uVideoPlanet: { value: new THREE.Vector2(0, 0) },
  }
  let videoPlanetFraction = 0
  const syncVideoPlanet = () => {
    const radius = videoPlanetFraction * sketchUniforms.uResolution.value.x
    sketchUniforms.uVideoPlanet.value.set(radius, radius * GLOBE.verticalStretch)
  }
  let planetScale = 1
  const syncPlanet = () => {
    const pxPerUnit = sketchUniforms.uResolution.value.x / ZOOM_VIDEO.width
    const radius = GLOBE.radius * planetScale * pxPerUnit
    sketchUniforms.uPlanet.value.set(radius, radius * GLOBE.verticalStretch)
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
  const sketchCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  // One scene unit is one pixel of the 1280 x 720 video frame.
  const halfWidth = ZOOM_VIDEO.width / 2
  const halfHeight = ZOOM_VIDEO.height / 2
  const camera = new THREE.OrthographicCamera(
    -halfWidth,
    halfWidth,
    halfHeight,
    -halfHeight,
    -1000,
    1000
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

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE.radius, 128, 96),
    new THREE.ShaderMaterial({
      uniforms: { map: { value: texture }, uScale: scaleUniform },
      vertexShader: `
        varying vec2 vUv;
        varying vec2 vScreen;
        void main() {
          vUv = uv;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          vScreen = viewPosition.xy;
          gl_Position = projectionMatrix * viewPosition;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        uniform float uScale;
        varying vec2 vUv;
        varying vec2 vScreen;
        void main() {
          // The map is already a finished line drawing, so it is shown as it is,
          // with a thin line round the edge of the globe.
          vec3 color = texture2D(map, vUv).rgb;
          float edge = length(vec2(vScreen.x, vScreen.y / ${GLOBE.verticalStretch.toFixed(4)})) / (${GLOBE.radius.toFixed(2)} * uScale);
          color = mix(color, vec3(0.05), smoothstep(0.994, 0.998, edge));
          gl_FragColor = vec4(color, 1.0);
        }`,
    })
  )
  tilt.add(planet)

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
    const spanX = milkyWay.spanDegrees * DEGREES
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
  const makeGalaxyTexture = (arms, tightness, seed0) => {
    const size = 256
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
    // A tilted disc as in the reference negative: a dark core, a pale oval ring with a
    // dense rim, then a wide cloud of scattered specks that thins out along the arms.
    const tilt = 2.6
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x - size / 2) / (size / 2)
        const dy = ((y - size / 2) / (size / 2)) * tilt
        const radius = Math.hypot(dx, dy)
        const angle = Math.atan2(dy, dx)
        const core = Math.exp(-(radius * radius) / 0.0016)
        const inner = radius < 0.17 ? 0.5 + 0.2 * (rnd() - 0.5) : 0
        const rim = Math.exp(-Math.pow((radius - 0.19) / 0.04, 2)) * 0.42 * (0.6 + 0.8 * rnd())
        const gap = radius > 0.22 && radius < 0.3 ? 0.35 : 1
        const arm = Math.pow(0.5 + 0.5 * Math.cos(arms * angle - tightness * Math.log(radius + 0.05)), 2)
        const speck = rnd() < 0.55 ? 1.5 : 0.35
        const halo = radius > 0.2 ? Math.exp(-radius * 2.4) * (0.22 + 0.6 * arm) * speck * gap : 0
        const value = Math.min(1, core * 1.2 + inner + rim + halo) * Math.max(0, 1 - Math.pow(radius / tilt, 3))
        const index = (y * size + x) * 4
        image.data[index] = Math.round(255 * Math.max(0, value))
        image.data[index + 3] = 255
      }
    }
    ctx2d.putImageData(image, 0, 0)
    // A soft focus: the specks and the ring blur into each other.
    const soft = document.createElement('canvas')
    soft.width = size
    soft.height = size
    const softCtx = soft.getContext('2d')
    softCtx.filter = 'blur(2.6px)'
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
  for (const [az, el, gw, gh, roll, arms, tight, seed] of galaxies) {
    placeOnSky(makeGalaxyTexture(arms, tight, seed), az, el, gw, gh, roll)
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
  ]
  for (const [kind, az, el, dw, dh, roll, seed, strength, tapered] of details) {
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
    // Radius of the clip's planet as a fraction of the frame's width; 0 once the
    // planet fills the frame and no space is left to replace.
    setVideoPlanet(fraction) {
      videoPlanetFraction = Math.max(0, fraction)
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
      skyYaw.rotation.y = (yaw - HOME_ROTATION.yaw) * GLOBE.skyFollow * DEGREES
      skyPitch.rotation.x = (pitch - HOME_ROTATION.pitch) * GLOBE.skyFollow * DEGREES
    },
    render() {
      updateMeteors(performance.now())
      const sketched = sketchUniforms.uAmount.value > 0.001
      const showsPlanet = sketchUniforms.uGlobeMix.value > 0.001 || !videoTexture
      if (videoTexture && sketchUniforms.uGlobeMix.value < 0.999) videoTexture.needsUpdate = true
      renderer.setRenderTarget(sketched ? sketchTarget : null)
      renderer.clear()
      if (showsPlanet || sketchUniforms.uStarsOn.value > 0.001) {
        renderer.render(skyScene, skyCamera)
      }
      if (showsPlanet) {
        renderer.clearDepth()
        renderer.render(scene, camera)
      }
      if (sketched) {
        renderer.setRenderTarget(null)
        renderer.clear()
        renderer.render(sketchScene, sketchCamera)
      }
      if (satelliteOn > 0.001) {
        satShared.uAlpha.value = satelliteOn
        renderer.clearDepth()
        satellite.visible = true
        placeSatellite()
        renderer.setRenderTarget(null)
        renderer.render(satelliteScene, camera)
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
      window.cancelAnimationFrame(meteorFrame)
      meteorStopped = true
      for (const entry of patches) {
        entry.geometry.dispose()
        entry.material.dispose()
      }
      videoTexture?.dispose()
      sketchTarget.dispose()
      sketchQuad.geometry.dispose()
      sketchQuad.material.dispose()
      renderer.dispose()
    },
  }
  return api
}
