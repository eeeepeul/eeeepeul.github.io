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
          vec3 color = texture2D(map, vUv).rgb;
          color = clamp(color * ${vec3(COLOR_GAIN)} + ${vec3(COLOR_OFFSET)}, 0.0, 1.0);
          float edge = length(vec2(vScreen.x, vScreen.y / ${GLOBE.verticalStretch.toFixed(4)})) / (${GLOBE.radius.toFixed(2)} * uScale);
          color = mix(color, ${vec3(HAZE_COLOR)}, ${HAZE_STRENGTH.toFixed(3)} * smoothstep(0.62, 0.9, edge));
          color += ${vec3(RIM_BOOST)} * smoothstep(0.95, 0.99, edge);
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

  return {
    setSize(width, height) {
      renderer.setSize(width, height, false)
      // Stars stay a similar size on screen when the frame is scaled up.
      starMaterial.uniforms.uPixelRatio.value =
        renderer.getPixelRatio() * Math.max(1, width / ZOOM_VIDEO.width) ** 0.7
    },
    // 1 is the size of the video's first frame; smaller shows the planet from
    // further away.
    setScale(scale) {
      tilt.scale.set(scale, scale * GLOBE.verticalStretch, scale)
      scaleUniform.value = scale
    },
    // yaw / pitch in degrees. The sky follows the planet's turn from the home view.
    setRotation(yaw, pitch) {
      planet.rotation.y = yaw * DEGREES
      tilt.rotation.x = pitch * DEGREES
      skyYaw.rotation.y = (yaw - HOME_ROTATION.yaw) * GLOBE.skyFollow * DEGREES
      skyPitch.rotation.x = (pitch - HOME_ROTATION.pitch) * GLOBE.skyFollow * DEGREES
    },
    render() {
      renderer.clear()
      renderer.render(skyScene, skyCamera)
      renderer.clearDepth()
      renderer.render(scene, camera)
    },
    dispose() {
      texture.dispose()
      planet.geometry.dispose()
      planet.material.dispose()
      glow.geometry.dispose()
      glow.material.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
      milkyWayTexture.dispose()
      patchGeometry.dispose()
      patchMaterial.dispose()
      renderer.dispose()
    },
  }
}
