const WORLD_TARGET = Object.freeze({ x: 0.5, y: 0.5 })

export const HOUSE_BOUNDS = Object.freeze({
  x: 0.56,
  y: 0.14,
  width: 0.2,
  height: 0.3,
  targetX: 0.66,
  targetY: 0.29,
})

function registerLevel({
  id,
  src,
  registrationScale,
  targetX,
  targetY,
  startZoom,
  endZoom,
}) {
  return Object.freeze({
    id,
    src,
    registrationScale,
    offsetX: WORLD_TARGET.x - targetX * registrationScale,
    offsetY: WORLD_TARGET.y - targetY * registrationScale,
    anchorX: 0.5,
    anchorY: 0.5,
    targetX,
    targetY,
    rotation: 0,
    startZoom,
    endZoom,
    worldTargetX: WORLD_TARGET.x,
    worldTargetY: WORLD_TARGET.y,
  })
}

export const MAP_LEVELS = Object.freeze([
  registerLevel({
    id: 'level-0',
    src: '/maps/level-0.png',
    registrationScale: 2.25,
    targetX: 0.53,
    targetY: 0.22,
    startZoom: 0,
    endZoom: 0.29,
  }),
  registerLevel({
    id: 'level-1',
    src: '/maps/level-1.png',
    registrationScale: 2.2,
    targetX: 0.618,
    targetY: 0.39,
    startZoom: 0.24,
    endZoom: 0.56,
  }),
  registerLevel({
    id: 'level-2',
    src: '/maps/level-2.png',
    registrationScale: 2.15,
    targetX: 0.615,
    targetY: 0.22,
    startZoom: 0.51,
    endZoom: 0.82,
  }),
  registerLevel({
    id: 'level-3',
    src: '/maps/level-3.png',
    registrationScale: 2.1,
    targetX: HOUSE_BOUNDS.targetX,
    targetY: HOUSE_BOUNDS.targetY,
    startZoom: 0.77,
    endZoom: 1,
  }),
])

export const DEEP_ZOOM_CONFIG = Object.freeze({
  durationMs: 18_000,
  initialScale: 1,
  finalScale: 8,
  easingExponent: 2.15,
  targetWorld: WORLD_TARGET,
})

export function clampProgress(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.min(1, Math.max(0, numericValue))
}

export function easeOutProgress(progress) {
  const clamped = clampProgress(progress)
  return 1 - (1 - clamped) ** DEEP_ZOOM_CONFIG.easingExponent
}

export function getActiveLevel(progress) {
  const clamped = clampProgress(progress)
  return (
    MAP_LEVELS.find(
      (level) => clamped >= level.startZoom && clamped <= level.endZoom
    ) ?? MAP_LEVELS[MAP_LEVELS.length - 1]
  )
}

export function getLevelRegistration(level, viewport = {}) {
  const width = finiteViewport(viewport.width, 1)
  const height = finiteViewport(viewport.height, 1)
  const unit = Math.max(width, height)
  const imageScale = level.registrationScale
  const imageTarget = rotatePoint(
    level.targetX * imageScale,
    level.targetY * imageScale,
    level.anchorX * imageScale,
    level.anchorY * imageScale,
    level.rotation
  )

  return {
    width: unit * imageScale,
    height: unit * imageScale,
    left: unit * level.offsetX,
    top: unit * level.offsetY,
    worldScale: imageScale,
    targetWorld: {
      x: level.offsetX + imageTarget.x,
      y: level.offsetY + imageTarget.y,
    },
    unit,
    viewport: { width, height },
  }
}

function rotatePoint(x, y, centerX, centerY, degrees) {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = x - centerX
  const dy = y - centerY
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  }
}

function finiteViewport(value, fallback) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback
}

export function getCameraState(progress, viewport = {}) {
  const clampedProgress = clampProgress(progress)
  const easedProgress = easeOutProgress(clampedProgress)
  const width = finiteViewport(viewport.width, 1)
  const height = finiteViewport(viewport.height, 1)
  const unit = Math.max(width, height)
  const scale =
    DEEP_ZOOM_CONFIG.initialScale *
    (DEEP_ZOOM_CONFIG.finalScale / DEEP_ZOOM_CONFIG.initialScale) ** easedProgress
  const scaledUnit = unit * scale
  const cameraX = width / 2 - WORLD_TARGET.x * scaledUnit
  const cameraY = height / 2 - WORLD_TARGET.y * scaledUnit

  return {
    progress: clampedProgress,
    easedProgress,
    scale,
    unit,
    cameraScale: scale,
    cameraX,
    cameraY,
    translateX: cameraX,
    translateY: cameraY,
    targetScreen: { x: width / 2, y: height / 2 },
    viewportCenter: { x: width / 2, y: height / 2 },
    viewport: { width, height },
    targetWorld: { ...WORLD_TARGET },
    activeLevel: getActiveLevel(clampedProgress).id,
  }
}

// Shared camera entry point for autoplay today and scroll binding later.
export function setCameraProgress(progress, viewport = {}) {
  return getCameraState(progress, viewport)
}
