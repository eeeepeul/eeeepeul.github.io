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
  durationSeconds: 8.375,
})

// Building centroids on the last frame, in video pixels.
const HOUSE_PIXELS = Object.freeze([
  { id: 'house1', x: 623, y: 304 },
  { id: 'house2', x: 632, y: 392 },
  { id: 'house3', x: 685, y: 406 },
  { id: 'house4', x: 654, y: 462 },
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
  { progress: 0.97, x: 623, y: 304, scale: 1 },
  { progress: 1, x: 623, y: 304, scale: 1 },
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
  hotspotProgress: 0.97,
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
  const timelineProgress = getVideoTimelineProgress(clampedProgress)
  const width = finiteViewport(viewport.width, 1)
  const height = finiteViewport(viewport.height, 1)
  // Fit the 16:9 frame to the window: exact in a 16:9 window, and in any other
  // window it is cropped rather than letterboxed.
  const scale = Math.max(width / ZOOM_VIDEO.width, height / ZOOM_VIDEO.height)
  const videoWidth = ZOOM_VIDEO.width * scale
  const videoHeight = ZOOM_VIDEO.height * scale

  return {
    progress: clampedProgress,
    timelineProgress,
    time: timelineProgress * ZOOM_VIDEO.durationSeconds,
    backgroundPinned: clampedProgress < GLOBE.backgroundEnd,
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
  // where the map's land is (white) and its sea (black), traced from the map, for the textured look
  landTexture: '/maps/globe-land.webp',
  // The point on the flat map (degrees east / north) at the middle of the planet
  // on the first frame of the zoom video. It sits a little south-east of the
  // settlement island, which the video shows just up and left of centre.
  homeLongitude: -24.2,
  homeLatitude: 5.2,
  // Planet radius in video-frame pixels, and how much taller than wide it is:
  // measured on the first frame of the zoom video (edge at half brightness).
  radius: 282,
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
  // Keep the actual 3D surface through the part of the supplied reference
  // sequence where the globe is still recognisable. Only once its rim is nearly
  // outside the viewport do we blend in the close-up detail frames, so the map
  // reads as the same surface continuing towards the viewer (Google Earth style).
  // Keep this reveal short. A long colour cross-fade makes the line work look
  // like a blur even though both source frames are sharp; Google Earth-style
  // zooms reveal the next map surface only once the old rim has left the view.
  handoffStart: 0.002,
  handoffEnd: 0.006,
  backgroundEnd: 0.4,
  // The first wheel step after the planet has turned home moves the clip at most
  // this far, so the camera never rushes as the 3D push-in begins.
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
  // A second photograph of the Milky Way, over on the other side of the sky.
  milkyWay2: Object.freeze({
    spanDegrees: 17,
    centerAzimuth: 12,
    centerElevation: -4,
    bandAngle: -14,
    brightness: 0.95,
  }),
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

// The whole zoom, from the planet at the size of the clip's first frame down to the supplied
// picture of the four houses, as one number: z = ln(how many times bigger than the first view).
// The wheel adds the same amount to z for the same turn, so every step looks equally big.
//   0 .. ln(aslant.scale)        the planet grows and turns aslant (the main land low on it, the
//                                planet's edge sweeping past below it)
//   .. ln(scale of handFrame)    it keeps growing as it lies flat again and moves to the view of
//                                the clip's frame `handFrame`; there the 3D planet is exactly that
//                                frame (it is one of the `details`), so the clip takes over unseen
//   .. ln(scale of frame 200)    the clip itself, frame by frame
//   .. end                       the supplied picture of the houses, which is the clip's last
//                                frame drawn again, closer and cleaner, takes over and the view
//                                stops on it
// All the numbers were measured by matching the clip's frames to the planet's map and to one
// another (normalised cross-correlation).
export const ZOOM_PATH = Object.freeze({
  // Fitted to the supplied reference: the planet's edge sweeping from the lower left up to the
  // right, the dark sky below it, and the main land a little above and left of the middle (x, y:
  // where the home point then is, frame units from the middle, y up).
  aslant: Object.freeze({ scale: 3.9, yaw: 18.25, pitch: 50.75, x: 13, y: 43, flat: 0.8 }),
  // Frames of the clip, sharper than the planet's map up close, laid onto the planet where they
  // show it: [frame, planet scale, view moved by x, y (frame units, y up)].
  details: Object.freeze(
    [
      [36, 2.0053, -7.73, 5.33],
      [56, 3.0319, -14.87, 13.42],
      [76, 4.3893, -28.03, 25.33],
      [90, 5.577, -38.7, 36.41],
      [106, 7.4887, -54.96, 52.68],
      [120, 9.7518, -70.53, 71.3],
    ].map((row) => Object.freeze(row))
  ),
  detailSrc: (frame) => `/maps/zoom-detail/frame-${frame}.webp`,
  handFrame: 120,
  // Where the clip's view is on the ground at some of its frames: [frame, planet scale, view moved by
  // x, y (frame units, y up)], as for `details`; in between, the view's middle moves evenly.
  clipViews: Object.freeze(
    [
      [120, 9.7518, -70.53, 71.3],
      [140, 15.4171, -113.19, 119.81],
      [160, 32.3464, -262.59, 270.42],
      [180, 68.9514, -581.54, 598.18],
      [200, 94.413, -808.4, 829.16],
    ].map((row) => Object.freeze(row))
  ),
  // land (white) and sea of every clip frame from the hand-over, 9 x 9 small pictures
  clipLand: '/maps/zoom-detail/clip-land.webp',
  // The point of the planet in the middle of the hand-over frame (degrees east, north).
  // The middle of the main land; seen aslant, the land round it is drawn flat (as from above).
  landLongitude: -26.35,
  landLatitude: 7.04,
  handLongitude: -25.6793,
  handLatitude: 6.5665,
  frameCount: 201,
  // ln(planet scale) of the clip's frames from the hand-over on, every second frame.
  frameScales: Object.freeze(
    [
      [120, 2.2774], [122, 2.3152], [124, 2.3526], [126, 2.3903], [128, 2.4277], [130, 2.467],
      [132, 2.5119], [134, 2.5617], [136, 2.6149], [138, 2.6725], [140, 2.7355], [142, 2.8014],
      [144, 2.8696], [146, 2.941], [148, 3.0142], [150, 3.089], [152, 3.1653], [154, 3.2423],
      [156, 3.32], [158, 3.3982], [160, 3.4765], [162, 3.5631], [164, 3.6494], [166, 3.7292],
      [168, 3.808], [170, 3.8858], [172, 3.9608], [174, 4.0373], [176, 4.1076], [178, 4.1725],
      [180, 4.2334], [182, 4.2873], [184, 4.3383], [186, 4.3837], [188, 4.4245], [190, 4.4602],
      [192, 4.4907], [194, 4.5151], [196, 4.5331], [198, 4.5438], [200, 4.5477],
    ].map((row) => Object.freeze(row))
  ),
  // The supplied picture of the houses on the clip's last frame: its middle there (frame
  // units, y down) and how many frame units one of its pixels covers.
  houses: Object.freeze({
    src: '/maps/zoom-detail/houses.webp',
    lastFrame: '/maps/zoom-detail/frame-200.webp',
    width: 1610,
    height: 977,
    x: 657.5,
    y: 390.2,
    unit: 0.4467,
  }),
  // z added per pixel of wheel
  perWheelPixel: 1 / 800,
})

const FRAME_SCALES = ZOOM_PATH.frameScales
export const ZOOM_HAND = FRAME_SCALES[0][1]
export const ZOOM_CLIP_END = FRAME_SCALES[FRAME_SCALES.length - 1][1]
// how much closer than the clip's last frame the view ends: the picture's height fills the frame
export const ZOOM_HOUSES_SCALE = ZOOM_VIDEO.height / (ZOOM_PATH.houses.height * ZOOM_PATH.houses.unit)
export const ZOOM_END = ZOOM_CLIP_END + Math.log(ZOOM_HOUSES_SCALE)
export const ZOOM_ASLANT = Math.log(ZOOM_PATH.aslant.scale)

// The clip's frame (fractional) shown at zoom z, between the hand-over and the last frame.
export function getClipFrame(z) {
  if (z <= FRAME_SCALES[0][1]) return FRAME_SCALES[0][0]
  for (let index = 1; index < FRAME_SCALES.length; index += 1) {
    const [toFrame, toZ] = FRAME_SCALES[index]
    if (z <= toZ) {
      const [fromFrame, fromZ] = FRAME_SCALES[index - 1]
      return fromFrame + ((toFrame - fromFrame) * (z - fromZ)) / (toZ - fromZ)
    }
  }
  return FRAME_SCALES[FRAME_SCALES.length - 1][0]
}

// The zoom at which the clip shows a frame (the other way round from getClipFrame).
export function getClipZoom(frame) {
  if (frame <= FRAME_SCALES[0][0]) return FRAME_SCALES[0][1]
  for (let index = 1; index < FRAME_SCALES.length; index += 1) {
    const [toFrame, toZ] = FRAME_SCALES[index]
    if (frame <= toFrame) {
      const [fromFrame, fromZ] = FRAME_SCALES[index - 1]
      return fromZ + ((toZ - fromZ) * (frame - fromFrame)) / (toFrame - fromFrame)
    }
  }
  return FRAME_SCALES[FRAME_SCALES.length - 1][1]
}

// Past the clip's last frame: how much closer the view is (k), the frame point at the middle of
// the view (x, y, frame units, y down) and how much of the houses picture shows (0 to 1). It is a
// plain zoom about the one point that stays put, so it moves exactly like a camera closing in.
export function getHousesView(z) {
  const amount = Math.min(1, Math.max(0, (z - ZOOM_CLIP_END) / (ZOOM_END - ZOOM_CLIP_END)))
  const k = Math.exp(Math.max(0, Math.min(z, ZOOM_END) - ZOOM_CLIP_END))
  const end = ZOOM_HOUSES_SCALE
  const from = { x: ZOOM_VIDEO.width / 2, y: ZOOM_VIDEO.height / 2 }
  const to = { x: ZOOM_PATH.houses.x, y: ZOOM_PATH.houses.y }
  const fixed = {
    x: (to.x - from.x / end) / (1 - 1 / end),
    y: (to.y - from.y / end) / (1 - 1 / end),
  }
  return {
    k,
    x: fixed.x + (from.x - fixed.x) / k,
    y: fixed.y + (from.y - fixed.y) / k,
    mix: smoothstep(0, 0.35, amount),
  }
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

// Size of the clip's planet relative to its first frame, by progress. Up to the
// end of the hand-off this is fitted to the land round the settlement island (the
// part that stays in view while zooming), so the 3D planet's coasts sit on the
// clip's; after that it follows the planet's edge. It grows slowly at first and then faster, until the planet fills the
// frame at about a third of the way through.
const VIDEO_PLANET_SCALES = Object.freeze([
  [0, 1],
  [0.0118, 1.0255],
  [0.0237, 1.0495],
  [0.0355, 1.0752],
  [0.0473, 1.105],
  [0.0592, 1.1336],
  [0.071, 1.163],
  [0.0824, 1.203],
  [0.1008, 1.255],
  [0.1179, 1.318],
  [0.1364, 1.383],
  [0.1605, 1.474],
  [0.1832, 1.577],
  [0.2074, 1.687],
])

// The clip's planet edge grows a little slower than the land in its middle (the
// clip is a picture, not a true projection). Edge size by progress, measured on
// the clip; used to squeeze the 3D planet's rim onto the clip's rim while its land
// stays on the clip's land.
const VIDEO_LIMB_SCALES = Object.freeze([
  [0, 1],
  [0.0114, 1.0177],
  [0.0241, 1.037],
  [0.0412, 1.073],
  [0.054, 1.0976],
  [0.0653, 1.126],
  [0.0824, 1.168],
  [0.1008, 1.218],
])

function readScaleTable(table, progress) {
  const value = clampProgress(progress)
  if (value <= table[0][0]) return table[0][1]
  for (let index = 1; index < table.length; index += 1) {
    const [toProgress, toScale] = table[index]
    if (value <= toProgress) {
      const [fromProgress, fromScale] = table[index - 1]
      return fromScale + ((toScale - fromScale) * (value - fromProgress)) / (toProgress - fromProgress)
    }
  }
  return table[table.length - 1][1]
}

// How much of the sky's stars stays over the clip: all of it while there is sky
// round the planet, none once the planet fills the frame.
export function getStarsAmount(progress) {
  return getVideoPlanetRadius(progress) > 0 ? 1 : 0
}

// The clip's planet in each of its first frames, measured on the picture itself:
// [centre x, centre y, half-width, half-height], all as fractions of the frame's
// width, the centre taken from the frame's middle. The clip keeps the planet's own
// picture only: the outline is redrawn as one clean ring at this size and the space
// round it is replaced by the 3D scene's sky, so the background stays put while the
// planet zooms. Past these frames the planet fills the frame.
export const VIDEO_PLANET_TABLE = Object.freeze(
  [[-0.00001,-0.00151,0.21974,0.22355],[-0.00024,-0.0015,0.22376,0.22767],[-0.00049,-0.00152,0.22777,0.2318],[-0.0007,-0.00153,0.23185,0.23598],[-0.0008,-0.0015,0.23607,0.24019],[-0.00081,-0.00144,0.2404,0.24444],[-0.0008,-0.00138,0.24481,0.24876],[-0.00082,-0.00133,0.24925,0.25317],[-0.00084,-0.00127,0.25372,0.25766],[-0.00086,-0.00119,0.25826,0.26223],[-0.00088,-0.00113,0.26292,0.26691],[-0.00091,-0.00113,0.26774,0.27175],[-0.00095,-0.00118,0.27267,0.27677],[-0.00101,-0.00122,0.27768,0.28189],[-0.00106,-0.00122,0.28272,0.28703],[-0.00113,-0.0012,0.28779,0.29217],[-0.0012,-0.00117,0.29295,0.29732],[-0.00127,-0.00116,0.29821,0.30264],[-0.00132,-0.00116,0.30358,0.30817],[-0.00136,-0.0012,0.3091,0.31385],[-0.00139,-0.00129,0.31473,0.3197],[-0.0014,-0.00135,0.32047,0.32574],[-0.00143,-0.00134,0.32632,0.33183],[-0.00146,-0.00126,0.33231,0.33793],[-0.00147,-0.00116,0.33844,0.34414],[-0.00148,-0.00106,0.34468,0.35051],[-0.00147,-0.00089,0.35102,0.35706],[-0.00147,-0.0007,0.35742,0.36375],[-0.00145,-0.00057,0.36389,0.37045],[-0.00142,-0.00045,0.37047,0.37722],[-0.00138,-0.0003,0.37715,0.38417],[-0.00135,-0.00012,0.38395,0.39123],[-0.00133,0.00007,0.39091,0.3983],[-0.00131,0.00027,0.398,0.40566],[-0.00128,0.00048,0.40522,0.41342],[-0.00125,0.00072,0.41258,0.42128],[-0.00121,0.00096,0.42008,0.42913],[-0.00115,0.00115,0.42775,0.437],[-0.00107,0.00137,0.43556,0.44536],[-0.00102,0.0017,0.44348,0.45426],[-0.00094,0.002,0.45156,0.46309],[-0.00089,0.00234,0.45976,0.47212],[-0.00088,0.00266,0.46808,0.48154],[-0.00089,0.00282,0.47674,0.4904],[-0.00093,0.003,0.48582,0.49868],[-0.00101,0.00342,0.49495,0.50772],[-0.00103,0.00379,0.50407,0.51729],[-0.00124,0.00458,0.5136,0.5267],[-0.00178,0.00625,0.5231,0.53564],[-0.00208,0.0077,0.53202,0.54388],[-0.00208,0.00866,0.54126,0.55289],[-0.00208,0.00963,0.55108,0.56292],[-0.00208,0.01059,0.56107,0.57314],[-0.00208,0.01155,0.57125,0.58354],[-0.00208,0.01251,0.58162,0.59412],[-0.00208,0.01347,0.59212,0.60485]].map((row) => Object.freeze(row))
)
const VIDEO_FRAME_RATE = 24

// Each frame carries its own number in the three bottom rows (eight black or white
// blocks), so the picture that is on screen is known exactly, whatever the seek
// landed on.
export const VIDEO_FRAME_CODE = Object.freeze({ bits: 8, blockWidth: 24, row: 1078 })

export function getVideoFrameIndex(progress) {
  return Math.floor(
    clampProgress(progress) * ZOOM_VIDEO.durationSeconds * VIDEO_FRAME_RATE + 0.001
  )
}

export function getVideoPlanetEllipse(frameIndex) {
  return VIDEO_PLANET_TABLE[frameIndex] ?? null
}

export function getVideoPlanetRadius(progress) {
  return VIDEO_PLANET_TABLE[getVideoFrameIndex(progress)]?.[2] ?? 0
}

// Edge of the clip's planet as a fraction of the 3D planet's edge (1 or a little
// less): how far the 3D planet's rim has to move in to sit on the clip's rim.
export function getVideoLimbRatio(progress) {
  return Math.min(1, readScaleTable(VIDEO_LIMB_SCALES, progress) / getVideoPlanetScale(progress))
}

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
  const value = clampProgress(progress)
  if (value <= GLOBE.handoffStart) return 1
  if (value >= GLOBE.handoffEnd) return 0
  return 1 - smoothstep(GLOBE.handoffStart, GLOBE.handoffEnd, value)
}

// The detail clip follows the same progress value as the wheel so its supplied
// reference frames are ready for the early, single-frame handoff.
export function getVideoTimelineProgress(progress) {
  return clampProgress(progress)
}

// A paused video can lag behind the wheel by several decoded frames. The globe
// may keep growing while that happens, but the visual handoff must never reveal
// a frame later than the one actually copied to the canvas.
export function getVideoHandoffProgress(progress, drawnTime) {
  const requested = clampProgress(progress)
  const actualTime = Number(drawnTime)
  if (!Number.isFinite(actualTime)) return 0
  const decoded = clampProgress(actualTime / ZOOM_VIDEO.durationSeconds)
  return Math.min(requested, decoded)
}

// The canvas can briefly lag behind a paused video's currentTime while a seek
// is being painted. Keep the 3D layer visible until the requested detail frame
// is within one display frame of the frame actually copied to the canvas.
export function isVideoFrameReady(progress, drawnTime, toleranceSeconds = 1 / 60) {
  const actualTime = Number(drawnTime)
  if (!Number.isFinite(actualTime)) return false
  const requestedTime = getVideoTimelineProgress(progress) * ZOOM_VIDEO.durationSeconds
  return Math.abs(actualTime - requestedTime) <= toleranceSeconds
}

// Seek events can arrive after a newer wheel update has requested another time.
// Only paint an event that still belongs to the current request.
export function isVideoSeekCurrent(requestedTime, actualTime, toleranceSeconds = 1 / 60) {
  const requested = Number(requestedTime)
  const actual = Number(actualTime)
  if (!Number.isFinite(requested) || !Number.isFinite(actual)) return false
  return Math.abs(actual - requested) <= toleranceSeconds
}

export function shouldRequestVideoSeek(currentTime, requestedTime, toleranceSeconds = 1 / 60) {
  const current = Number(currentTime)
  const requested = Number(requestedTime)
  if (!Number.isFinite(current) || !Number.isFinite(requested)) return false
  return Math.abs(current - requested) > toleranceSeconds
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
  crossFrom: 0.27,
  crossTo: 0.35,
})

// How much of the numbered key shows (the symbol-only key shows the rest).
export function getLegendNumberedOpacity(progress) {
  return smoothstep(MAP_LEGEND.crossFrom, MAP_LEGEND.crossTo, clampProgress(progress))
}
