// One supplied zoom video (planet -> island -> houses) scrubbed by the wheel.
// The clip is encoded with every frame a keyframe so it can be sought forwards
// and backwards without stalling: progress 0 is the first frame, 1 the last.
export const ZOOM_VIDEO = Object.freeze({
  src: '/maps/zoom.mp4',
  poster: '/maps/zoom-poster.webp',
  width: 1280,
  height: 720,
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

export const DEEP_ZOOM_CONFIG = Object.freeze({
  // Hotspots become clickable only once the video is this close to the end.
  hotspotProgress: 0.985,
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
  return {
    x: state.video.left + hotspot.x * state.video.width,
    y: state.video.top + hotspot.y * state.video.height,
    videoWidth: state.video.width,
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
  homeLongitude: -23.1,
  homeLatitude: 5.4,
  // Planet radius in video-frame pixels, and how much taller than wide it is:
  // measured on the first frame of the zoom video (edge at half brightness).
  radius: 275,
  verticalStretch: 1.018,
  // Degrees of rotation per pixel dragged.
  dragDegreesPerPixel: 0.25,
  // The latitude the pointer can tilt the planet to, either side of the equator.
  maxLatitude: 80,
  // How long the planet takes to turn to the home view when zooming starts.
  alignMs: 700,
})

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
