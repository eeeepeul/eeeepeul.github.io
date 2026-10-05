// One supplied zoom video (planet -> island -> houses) scrubbed by the wheel.
// The clip is encoded with a keyframe every few frames so it can be sought forwards
// and backwards without stalling: progress 0 is the first frame, 1 the last.
export const ZOOM_VIDEO = Object.freeze({
  src: '/maps/zoom.mp4',
  poster: '/maps/zoom-poster.webp',
  // The frame's coordinate system (hotspots, planet size) is 1280 x 720 whatever
  // the file's resolution, so a sharper encode needs no other change.
  width: 1280,
  height: 720,
  // Resolution of the encoded clip (upscaled from the 1280 x 720 original with a
  // light sharpen and a high-quality encode), and so of the canvas it is drawn to.
  bufferWidth: 1920,
  bufferHeight: 1080,
  durationSeconds: 10,
})

// Building centroids on the last frame, in video pixels.
const HOUSE_PIXELS = Object.freeze([
  { id: 'house1', x: 623, y: 302 },
  { id: 'house2', x: 634, y: 389 },
  { id: 'house3', x: 685, y: 402 },
  { id: 'house4', x: 655, y: 458 },
])

// Hotspot centers on the last frame, as fractions of the video.
export const HOUSE_HOTSPOTS = Object.freeze(
  HOUSE_PIXELS.map(({ id, x, y }) =>
    Object.freeze({ id, x: x / ZOOM_VIDEO.width, y: y / ZOOM_VIDEO.height })
  )
)

// Where the first house sits on the clip as it zooms in, and how big the group is
// compared with the last frame (measured from the clip). The other houses keep
// their offsets from the first one, scaled by `scale`.
const HOTSPOT_TRACK = Object.freeze([
  { progress: 0.65, x: 629, y: 336, scale: 0.41 },
  { progress: 0.7, x: 627, y: 329, scale: 0.52 },
  { progress: 0.8, x: 624, y: 312, scale: 0.82 },
  { progress: 0.9, x: 623, y: 302, scale: 0.98 },
  { progress: 1, x: 623, y: 302, scale: 1 },
])

export function getHotspotTrack(progress) {
  const last = HOTSPOT_TRACK.length - 1
  if (progress <= HOTSPOT_TRACK[0].progress) return HOTSPOT_TRACK[0]
  if (progress >= HOTSPOT_TRACK[last].progress) return HOTSPOT_TRACK[last]
  let index = 0
  while (HOTSPOT_TRACK[index + 1].progress < progress) index += 1
  const from = HOTSPOT_TRACK[index]
  const to = HOTSPOT_TRACK[index + 1]
  const t = (progress - from.progress) / (to.progress - from.progress)
  return {
    progress,
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    scale: from.scale + (to.scale - from.scale) * t,
  }
}

export const DEEP_ZOOM_CONFIG = Object.freeze({
  // Hotspots become clickable only once the video is this close to the end.
  // The houses are readable on the clip from here, so they can be clicked from here.
  hotspotProgress: 0.65,
})

export function clampProgress(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.min(1, Math.max(0, numericValue))
}

function finiteViewport(value, fallback) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback
}

export function getCameraState(progress, viewport = {}) {
  const clampedProgress = clampProgress(progress)
  const width = finiteViewport(viewport.width, 1)
  const height = finiteViewport(viewport.height, 1)
  // Fit the 16:9 frame to the window: exact in a 16:9 window, and in any other
  // window it is cropped rather than letterboxed.
  const scale = Math.max(width / ZOOM_VIDEO.width, height / ZOOM_VIDEO.height)
  const videoWidth = ZOOM_VIDEO.width * scale
  const videoHeight = ZOOM_VIDEO.height * scale

  return {
    progress: clampedProgress,
    time: clampedProgress * ZOOM_VIDEO.durationSeconds,
    scale,
    viewport: { width, height },
    video: {
      left: (width - videoWidth) / 2,
      top: (height - videoHeight) / 2,
      width: videoWidth,
      height: videoHeight,
    },
    hotspotsActive: clampedProgress >= DEEP_ZOOM_CONFIG.hotspotProgress,
  }
}

// Screen position of a point on the video, given as a fraction of the frame.
export function getHotspotCenter(state, hotspot) {
  const track = getHotspotTrack(state.progress)
  const first = HOUSE_HOTSPOTS[0]
  const x = track.x / ZOOM_VIDEO.width + (hotspot.x - first.x) * track.scale
  const y = track.y / ZOOM_VIDEO.height + (hotspot.y - first.y) * track.scale
  return {
    x: state.video.left + x * state.video.width,
    y: state.video.top + y * state.video.height,
    videoWidth: state.video.width,
    scale: track.scale,
  }
}

// Shared camera entry point for wheel, touch and keyboard bindings.
export function setCameraProgress(progress, viewport = {}) {
  return getCameraState(progress, viewport)
}

// The planet at the start. It is drawn in the same 1280 x 720 frame as the zoom
// video, so its first picture lines up with the video's first frame.
export const GLOBE = Object.freeze({
  texture: '/maps/globe-map.webp',
  // The point on the flat map (degrees east / north) at the middle of the planet
  // on the first frame of the zoom video. It sits a little south-east of the
  // settlement island, which the video shows just up and left of centre.
  homeLongitude: -21.8,
  homeLatitude: 8,
  // Planet radius in video-frame pixels, and how much taller than wide it is:
  // measured on the first frame of the zoom video (edge at half brightness).
  radius: 275,
  verticalStretch: 1.018,
  // The latitude the pointer can tilt the planet to, either side of the equator.
  maxLatitude: 80,
  // How long the planet takes to turn to the home view when zooming starts.
  alignMs: 700,
  // The planet starts small, in a field of stars, and grows to the size of the
  // video's first frame (scale 1) before the clip takes over.
  minScale: 0.36,
  // One unit of progress along the clip is worth this much planet growth, so a
  // wheel step grows the planet faster than it scrubs the clip.
  zoomPerProgress: 2.4,
  zoomSmoothingMs: 200,
  // The hand-off from the 3D planet to the clip. For these stretches of the clip
  // (progress) the planet is still drawn, scaled exactly as the clip's own planet
  // is, and dissolves into the clip; so both grow together while one becomes the
  // other, instead of one popping in over the other.
  handoffStart: 0.02,
  handoffEnd: 0.14,
  // The first wheel step after the planet has turned home moves the clip at most
  // this far, so the clip never rushes in as the dissolve begins.
  firstStepMax: 0.03,
  // The sky: a photograph of the Milky Way laid on a patch of the sky sphere
  // (faded to black at its edges), with extra stars scattered all round it, all
  // seen through a perspective camera.
  starCount: 14000,
  skyFieldOfView: 40,
  // How much of a planet turn the sky follows. 1 is the real thing: the sky is
  // far behind the planet, so as the planet is turned the stars sweep across the
  // screen the opposite way and about ten times faster than its surface, like
  // the sky in Google Earth (measured on a screen recording of it).
  skyFollow: 1,
  milkyWay: Object.freeze({
    texture: '/maps/milky-way.webp',
    width: 1125,
    height: 2000,
    // Width of the photo's patch of sky (degrees); its height follows from the
    // photo's proportions so its stars keep a natural shape.
    spanDegrees: 20.7,
    // Where the middle of the patch sits at the home view (degrees right / up).
    centerAzimuth: -8,
    centerElevation: 6,
    // The photo's own dark sky is not pure black; this much is taken off so only
    // the stars and the glow are added to the scene, not a blue rectangle.
    blackLevel: 0.055,
    // The glow is kept inside an ellipse laid along the band in the photo (which
    // runs up and to the right), fading smoothly to nothing towards its edge.
    // Axes are fractions of half the photo's height; the angle is measured from
    // vertical, in degrees.
    bandAngle: 22,
    bandLength: 0.9,
    bandWidth: 0.5,
    // How much of the ellipse's radius is solid before the fade begins, and how
    // far the ragged edge of the fade may wander (fractions of the radius).
    solidRadius: 0.18,
    edgeWander: 0.16,
    brightness: 1.05,
  }),
})

export function clampUnit(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.min(1, Math.max(0, numericValue))
}

// Planet scale for a growth amount: 0 is the small planet, 1 is the video's
// first frame. Growth is exponential so every wheel step feels the same.
export function getGlobeScale(growth) {
  return GLOBE.minScale ** (1 - clampUnit(growth))
}

export function clampLatitude(degrees) {
  const limit = GLOBE.maxLatitude
  return Math.min(limit, Math.max(-limit, Number(degrees) || 0))
}

// Rotation (degrees) that brings a longitude/latitude to face the viewer on a
// three.js sphere with an equirectangular map: yaw about Y, pitch about X.
export function getFacingRotation(longitude, latitude) {
  return { yaw: -90 - longitude, pitch: latitude }
}

export const HOME_ROTATION = Object.freeze(
  getFacingRotation(GLOBE.homeLongitude, GLOBE.homeLatitude)
)

// Signed turn from one yaw to another by the shorter way round, in degrees.
export function getShortestYawDelta(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180
}

export function easeInOut(amount) {
  const t = Math.min(1, Math.max(0, amount))
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

// Degrees of planet turn that a drag of one on-screen pixel should make so the
// surface under the pointer follows it: one pixel is 1 / (radius * scale)
// radians. `frameScale` is how many screen pixels one video-frame pixel is.
export function getDragDegreesPerPixel(globeScale, frameScale = 1) {
  const pixelsPerRadian = GLOBE.radius * Math.max(0.01, globeScale) * Math.max(0.01, frameScale)
  return 180 / Math.PI / pixelsPerRadian
}

// Planet turn (degrees) that keeps the point under the pointer under it while the
// planet changes size, as a zoom towards the pointer. `point` is the pointer in
// video-frame pixels from the planet's centre. Returns the surface displacement
// to apply as { yaw, pitch }, or null when the pointer is off the planet.
export function getZoomAnchorTurn(point, fromScale, toScale) {
  const distance = Math.hypot(point.x, point.y)
  if (distance < 1e-6) return null
  const before = distance / (GLOBE.radius * fromScale)
  const after = distance / (GLOBE.radius * toScale)
  if (before >= 0.98 || after >= 0.98) return null
  // The surface point under the pointer moves back towards the centre by this
  // much while the planet grows (away from it while it shrinks).
  const turn = (Math.asin(before) - Math.asin(after)) * (180 / Math.PI)
  return { yaw: (-point.x / distance) * turn, pitch: (-point.y / distance) * turn }
}

// Size of the clip's planet relative to its first frame, by progress, measured on
// the clip (circle fitted to the planet's edge, centre stays in the frame's
// middle). It grows slowly at first and then faster, until the planet fills the
// frame at about a quarter of the way through.
const VIDEO_PLANET_SCALES = Object.freeze([
  [0, 1],
  [0.0167, 1.005],
  [0.0333, 1.019],
  [0.05, 1.044],
  [0.0667, 1.082],
  [0.0833, 1.132],
  [0.1, 1.197],
  [0.1167, 1.276],
  [0.1333, 1.368],
  [0.15, 1.475],
  [0.1667, 1.595],
  [0.1833, 1.731],
  [0.2, 1.88],
  [0.2167, 2.048],
  [0.2333, 2.231],
  [0.25, 2.435],
])

export function getVideoPlanetScale(progress) {
  const table = VIDEO_PLANET_SCALES
  const value = clampProgress(progress)
  if (value <= table[0][0]) return table[0][1]
  for (let index = 1; index < table.length; index += 1) {
    const [toProgress, toScale] = table[index]
    if (value <= toProgress) {
      const [fromProgress, fromScale] = table[index - 1]
      const amount = (value - fromProgress) / (toProgress - fromProgress)
      return fromScale + (toScale - fromScale) * amount
    }
  }
  // Past the table the planet already fills the frame; keep growing steadily.
  const [lastProgress, lastScale] = table[table.length - 1]
  const [prevProgress, prevScale] = table[table.length - 2]
  const rate = (lastScale - prevScale) / (lastProgress - prevProgress)
  return lastScale + rate * (value - lastProgress)
}

function smoothstep(from, to, value) {
  const amount = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return amount * amount * (3 - 2 * amount)
}

// How much of the 3D planet still shows over the clip at this progress.
export function getHandoffOpacity(progress) {
  return 1 - smoothstep(GLOBE.handoffStart, GLOBE.handoffEnd, clampProgress(progress))
}

// The map key, always shown in the top-left corner. Placement was measured on the
// supplied mock-up (a 2000 x 1125 screen): both pictures are 172 x 904 with the
// drawn part at the same place, 1.29% from the left and 3.75% from the top, 42% of
// the screen's height tall, so they lie exactly over one another.
//   - `symbols` (no numbers) is shown while the black of space is on screen;
//   - `numbered` takes over as the planet fills the screen and space disappears.
export const MAP_LEGEND = Object.freeze({
  symbols: '/maps/legend-symbols.png',
  numbered: '/maps/legend.png',
  width: 172,
  height: 904,
  left: '1.29%',
  top: '3.75%',
  heightPercent: '42%',
  // Clip progress over which the two cross. The planet fills the frame, hiding the
  // last of the black, when the clip is about a quarter of the way through.
  crossFrom: 0.2,
  crossTo: 0.28,
})

// How much of the numbered key shows (the symbol-only key shows the rest).
export function getLegendNumberedOpacity(progress) {
  return smoothstep(MAP_LEGEND.crossFrom, MAP_LEGEND.crossTo, clampProgress(progress))
}
