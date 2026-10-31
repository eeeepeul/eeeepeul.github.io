'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  GLOBE,
  HOME_ROTATION,
  HOUSE_HOTSPOTS,
  MAP_LEGEND,
  ZOOM_ASLANT,
  ZOOM_CLIP_END,
  ZOOM_END,
  ZOOM_HAND,
  ZOOM_PATH,
  ZOOM_VIDEO,
  clampLatitude,
  easeInOut,
  getClipFrame,
  getClipZoom,
  getDragDegreesPerPixel,
  getHotspotCenter,
  getHousesView,
  getLegendNumberedOpacity,
  getShortestYawDelta,
  setCameraProgress,
  VIDEO_FRAME_CODE,
} from '../../lib/deep-zoom-map.mjs'

// Old wheel and touch amounts were in clip progress; this many units of zoom (z) make one.
const Z_PER_PROGRESS = 3.5
const TOUCH_PROGRESS_PER_PIXEL = 1 / 600
const PINCH_PROGRESS_PER_PIXEL = 1 / 500
const ZOOM_SMOOTHING_MS = 200
// Skip seeks smaller than a few frames' worth of drift to keep scrubbing cheap.
const MIN_SEEK_SECONDS = 1 / 60
// How quickly a released drag stops spinning (ms for the speed to fall by 1/e).
const SPIN_DECAY_MS = 260
const MIN_SPIN_SPEED = 0.002
// Fastest a released drag may keep spinning, in degrees per ms.
const MAX_SPIN_SPEED = 0.16
// A drag that paused this long before release does not coast.
const SPIN_IDLE_MS = 90
// Changes with every new set of the map's pictures: browsers keep pictures for minutes, and an old
// copy of one picture next to the new others (e.g. frames without the land channel) breaks the look.
const PICTURES = 'v=3'
const withVersion = (url) => `${url}?${PICTURES}`
// This close below the hand-over the clip is already sought to its frame, so it is ready.
const PRESEEK_Z = 0.45
// Edge of the houses picture faded into the clip's last frame under it (picture pixels).
const HOUSES_FEATHER = 28
// The wheel rests a little on the aslant view (the site's main view): this much turning of the wheel
// (in z) passes over it without moving.
const ASLANT_HOLD = 0.4
// Over these zooms the textured planet brings in the map's fine lines (roads, rivers), which the
// clip then keeps.
const LINES_FROM = 1.8
// zoom for an amount of wheel turned, with the rest on the aslant view
// where the page opens: in the middle of the rest on the aslant view
const START_TURN = ZOOM_ASLANT + ASLANT_HOLD / 2
const zoomForTurn = (turn) =>
  turn < ZOOM_ASLANT ? turn : turn < ZOOM_ASLANT + ASLANT_HOLD ? ZOOM_ASLANT : turn - ASLANT_HOLD

// progress along the clip that lands in the middle of a frame
const frameProgress = (frame) => Math.min(1, (frame + 0.5) / ZOOM_PATH.frameCount)
const HAND_PROGRESS = frameProgress(ZOOM_PATH.handFrame)
const clamp01 = (value) => Math.min(1, Math.max(0, value))

// The planet at zoom z (below the hand-over), turned from wherever it was dragged to (`yaw`,
// `pitch`). It grows by e^z. Over the first stretch it turns home and then aslant, the view held on
// the home point; over the second it lies flat again while the view moves on to the middle of the
// hand-over frame, so at the hand-over it is exactly that frame.
function getPlanetView(z, yaw, pitch) {
  const rise = easeInOut(clamp01(z / ZOOM_ASLANT))
  const fall = easeInOut(clamp01((z - ZOOM_ASLANT) / (ZOOM_HAND - ZOOM_ASLANT)))
  const aslant = rise * (1 - fall)
  const { aslant: turn } = ZOOM_PATH
  return {
    scale: Math.exp(z),
    yaw: yaw + getShortestYawDelta(yaw, HOME_ROTATION.yaw) * rise + turn.yaw * aslant,
    pitch: pitch + (HOME_ROTATION.pitch - pitch) * rise + turn.pitch * aslant,
    longitude: GLOBE.homeLongitude + (ZOOM_PATH.handLongitude - GLOBE.homeLongitude) * fall,
    latitude: GLOBE.homeLatitude + (ZOOM_PATH.handLatitude - GLOBE.homeLatitude) * fall,
    focus: rise,
    offsetX: turn.x * aslant,
    offsetY: turn.y * aslant,
    // the space round the planet is the dark night sky all the way, from the first view on
    space: 1,
    lines: easeInOut(clamp01((z - LINES_FROM) / (ZOOM_HAND - LINES_FROM))),
    // the main land flattened (its far side keeps more of the planet's own tilt, see globe-scene)
    flat: aslant * turn.flat,
  }
}

// The houses picture with its edges faded out, so it can lie over the clip's last frame.
function featherPicture(image, feather) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  context.globalCompositeOperation = 'destination-out'
  const { width, height } = canvas
  const edges = [
    [0, 0, feather, 0, 0, 0, feather, height],
    [width, 0, width - feather, 0, width - feather, 0, feather, height],
    [0, 0, 0, feather, 0, 0, width, feather],
    [0, height, 0, height - feather, 0, height - feather, width, feather],
  ]
  edges.forEach(([x0, y0, x1, y1, rx, ry, rw, rh]) => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1)
    gradient.addColorStop(0, 'rgba(0,0,0,1)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient
    context.fillRect(rx, ry, rw, rh)
  })
  return canvas
}

// Past the clip's last frame: the last frame and, over it, the houses picture, both seen from
// closer in (getHousesView), drawn into the frame canvas the clip is shown from.
function drawHouses(canvasNode, view, lastFrame, houses) {
  const context = canvasNode.getContext('2d', { willReadFrequently: true })
  if (!context || !lastFrame) return
  const unit = canvasNode.width / ZOOM_VIDEO.width
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.fillStyle = '#fbfbf9'
  context.fillRect(0, 0, canvasNode.width, canvasNode.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.setTransform(
    view.k * unit,
    0,
    0,
    view.k * unit,
    (ZOOM_VIDEO.width / 2 - view.x * view.k) * unit,
    (ZOOM_VIDEO.height / 2 - view.y * view.k) * unit
  )
  context.drawImage(lastFrame, 0, 0, ZOOM_VIDEO.width, ZOOM_VIDEO.height)
  if (houses && view.mix > 0) {
    const { houses: picture } = ZOOM_PATH
    context.globalAlpha = view.mix
    context.drawImage(
      houses,
      picture.x - (picture.width / 2) * picture.unit,
      picture.y - (picture.height / 2) * picture.unit,
      picture.width * picture.unit,
      picture.height * picture.unit
    )
    context.globalAlpha = 1
  }
  context.setTransform(1, 0, 0, 1, 0, 0)
}

function clampSpin(speed) {
  return Math.min(MAX_SPIN_SPEED, Math.max(-MAX_SPIN_SPEED, speed))
}

function setFrameGeometry(node, state) {
  if (!node) return

  node.style.left = `${state.video.left}px`
  node.style.top = `${state.video.top}px`
  node.style.width = `${state.video.width}px`
  node.style.height = `${state.video.height}px`
}

// Paused videos are not repainted reliably after a seek in every browser, so the
// visible frame is a canvas that copies whatever frame the hidden video lands on.
// Returns the number of the frame that was drawn, read back from the blocks the clip
// carries in its bottom rows (from the video's time when they cannot be read), or null when
// nothing was drawn (the canvas still holds the frame it had).
function drawFrame(canvasNode, videoNode) {
  if (!canvasNode || !videoNode || videoNode.readyState < 2) return null
  const context = canvasNode.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(videoNode, 0, 0, canvasNode.width, canvasNode.height)
  try {
    const { bits, blockWidth, row } = VIDEO_FRAME_CODE
    const scale = canvasNode.width / ZOOM_VIDEO.bufferWidth
    const strip = context.getImageData(0, Math.round(row * scale), Math.round(bits * blockWidth * scale), 1).data
    let frame = 0
    for (let bit = 0; bit < bits; bit += 1) {
      const x = Math.round((bit * blockWidth + blockWidth / 2) * scale)
      frame = (frame << 1) | (strip[x * 4] < 128 ? 1 : 0)
    }
    return frame
  } catch {
    return Math.round(videoNode.currentTime * 24)
  }
}

// `view`: past the clip's last frame, how much closer the view is and where (getHousesView)
function setHotspotGeometry(hotspotNodes, state, view) {
  hotspotNodes.forEach((node, index) => {
    if (!node) return
    const center = getHotspotCenter(state, HOUSE_HOTSPOTS[index])
    let { x, y } = center
    let size = center.videoWidth * 0.045 * center.scale
    if (view) {
      const unit = state.video.width / ZOOM_VIDEO.width
      const fx = (x - state.video.left) / unit
      const fy = (y - state.video.top) / unit
      x = state.video.left + (ZOOM_VIDEO.width / 2 + (fx - view.x) * view.k) * unit
      y = state.video.top + (ZOOM_VIDEO.height / 2 + (fy - view.y) * view.k) * unit
      size *= view.k
    }
    node.style.left = `${x}px`
    node.style.top = `${y}px`
    node.style.width = `${size}px`
    node.style.height = `${size}px`
  })
}

function applyCameraFrame(rootNode, nodes, progress, view = null) {
  if (!rootNode) return null

  const rect = rootNode.getBoundingClientRect()
  const state = setCameraProgress(progress, {
    width: rect.width,
    height: rect.height,
  })

  setFrameGeometry(nodes.canvas, state)
  setFrameGeometry(nodes.globeCanvas, state)
  setHotspotGeometry(nodes.hotspots, state, view)
  if (nodes.legendNumbered && nodes.legendSymbols) {
    const numbered = getLegendNumberedOpacity(progress)
    nodes.legendNumbered.style.opacity = String(numbered)
    nodes.legendSymbols.style.opacity = String(1 - numbered)
  }
  // One seek at a time: asking again while the video is still seeking only makes it fall further
  // behind (backwards most of all). The next one starts as this one lands (see handleSeeked).
  if (nodes.video && !nodes.video.seeking && Math.abs(nodes.video.currentTime - state.time) > MIN_SEEK_SECONDS) {
    nodes.video.currentTime = state.time
  }

  rootNode.dataset.mapProgress = state.progress.toFixed(4)
  rootNode.dataset.mapScale = state.scale.toFixed(4)
  rootNode.dataset.mapHouses = state.hotspotsActive ? 'active' : 'inactive'
  return state
}

export function DeepZoomMap() {
  const rootRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const globeCanvasRef = useRef(null)
  const hotspotRefs = useRef([])
  const legendNumberedRef = useRef(null)
  const legendSymbolsRef = useRef(null)
  const progressRef = useRef(0)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const rootNode = rootRef.current
    const videoNode = videoRef.current
    const canvasNode = canvasRef.current
    const globeCanvasNode = globeCanvasRef.current
    if (!rootNode || !videoNode || !canvasNode || !globeCanvasNode) return undefined

    const nodes = {
      video: videoNode,
      canvas: canvasNode,
      globeCanvas: globeCanvasNode,
      hotspots: hotspotRefs.current,
      legendNumbered: legendNumberedRef.current,
      legendSymbols: legendSymbolsRef.current,
    }

    let cancelled = false
    let frameId = 0
    let lastTimestamp = 0
    let globe = null
    let globeSize = ''
    // 'loading' until the planet is ready; 'globe' below the hand-over (the 3D planet, which can be
    // dragged round while it is at its first size); 'video' from there on (the clip, then the houses).
    let mode = 'loading'
    // The toolbar's satellite button and the layer list's checkboxes.
    let satelliteEnabled = true
    // How far in the view is (see ZOOM_PATH), and where the wheel is taking it.
    let zoom = ZOOM_ASLANT
    // how much the wheel has been turned (zoomForTurn makes it a zoom)
    let turnTarget = START_TURN
    // Where the planet has been dragged to; the zoom turns it home from here.
    let yaw = HOME_ROTATION.yaw
    let pitch = HOME_ROTATION.pitch
    let spinYaw = 0
    let spinPitch = 0
    let dragging = false
    let dragPointerId = null
    let lastPointer = null
    // The pictures past the clip's end, and whether the frame canvas holds them just now.
    let lastFrame = null
    let houses = null
    let housesDrawn = false
    // the clip's frame the frame canvas holds just now (read from the frame itself)
    let shownFrame = -1

    const getFrameScale = () => {
      const width = globeCanvasNode.getBoundingClientRect().width
      return width > 0 ? width / ZOOM_VIDEO.width : 1
    }

    const syncGlobeSize = (state) => {
      if (!globe || !state) return
      const key = `${Math.round(state.video.width)}x${Math.round(state.video.height)}`
      if (key === globeSize) return
      globeSize = key
      globe.setSize(state.video.width, state.video.height)
    }

    const setMode = (nextMode) => {
      if (mode === nextMode) return
      mode = nextMode
      rootNode.dataset.mapMode = nextMode
      // the canvas follows the zoom from frame to frame, with no fade of its own
      globeCanvasNode.style.transitionDuration = nextMode === 'loading' ? '' : '0s'
      globeCanvasNode.style.opacity = nextMode === 'loading' ? '0' : '1'
    }

    // The planet (below the hand-over).
    const showPlanet = (z = zoom) => {
      const view = getPlanetView(z, yaw, pitch)
      globe.setScale(view.scale)
      globe.setRotation(view.yaw, view.pitch)
      globe.setFocus(view.longitude, view.latitude, view.focus, view.offsetX, view.offsetY)
      globe.setSpace(view.space)
      globe.setFlat(view.flat, ZOOM_PATH.landLongitude, ZOOM_PATH.landLatitude)
      globe.setStyle(1)
      globe.setLines(view.lines)
      globe.setLimbRatio(1)
      globe.setVideoPlanet(0)
      globe.setStarsAmount(0)
      globe.setGlobeMix(1, 1)
      globe.setSatellite(satelliteEnabled ? 1 - clamp01(zoom / 0.35) : 0)
      globe.render()
      rootNode.dataset.mapRotation = `${view.yaw.toFixed(1)} ${view.pitch.toFixed(1)}`
    }

    // The clip, and past its last frame the houses picture, drawn as the same sheet.
    const showClip = (housesView) => {
      if (!globe) return
      // where the view is on the ground, for the textured look
      if (housesView) {
        const [, s, x, y] = ZOOM_PATH.clipViews[ZOOM_PATH.clipViews.length - 1]
        const k = housesView.k
        globe.setClipView({
          scale: s * k,
          x: k * (housesView.x - ZOOM_VIDEO.width / 2 + x),
          y: k * (ZOOM_VIDEO.height / 2 - housesView.y + y),
          cell: 80,
          allLand: true,
        })
      } else {
        // the frame actually on screen (the video may still be seeking towards the zoom's frame), so
        // the land and the grain sit on the picture that is there
        const wanted = getClipFrame(zoom)
        const frame = shownFrame >= ZOOM_PATH.handFrame ? shownFrame : wanted
        const views = ZOOM_PATH.clipViews
        let index = 0
        while (index < views.length - 2 && views[index + 1][0] < frame) index += 1
        const [f0, s0, x0, y0] = views[index]
        const [f1, s1, x1, y1] = views[index + 1]
        const t = clamp01((frame - f0) / (f1 - f0))
        const scale = Math.exp(getClipZoom(frame))
        globe.setClipView({
          scale,
          x: (x0 / s0 + (x1 / s1 - x0 / s0) * t) * scale,
          y: (y0 / s0 + (y1 / s1 - y0 / s0) * t) * scale,
          cell: frame - ZOOM_PATH.handFrame,
          allLand: false,
        })
      }
      globe.setFocus(ZOOM_PATH.handLongitude, ZOOM_PATH.handLatitude, 0)
      globe.setSpace(0)
      globe.setFlat(0, ZOOM_PATH.landLongitude, ZOOM_PATH.landLatitude)
      globe.setStyle(1)
      globe.setLimbRatio(1)
      globe.setVideoPlanet(0)
      globe.setStarsAmount(0)
      globe.setGlobeMix(0, 0)
      globe.setSatellite(0)
      globe.render()
    }

    const show = () => {
      const inClip = zoom >= ZOOM_HAND || !globe
      const view = zoom > ZOOM_CLIP_END ? getHousesView(zoom) : null
      // the clip's frame for this zoom; below the hand-over it waits on the hand-over frame
      let progress = 0
      if (inClip) {
        progress = globe ? frameProgress(getClipFrame(zoom)) : Math.min(1, zoom / ZOOM_CLIP_END)
      } else if (zoom > ZOOM_HAND - PRESEEK_Z) {
        progress = HAND_PROGRESS
      }
      progressRef.current = progress
      const state = applyCameraFrame(rootNode, nodes, progress, view)
      syncGlobeSize(state)
      rootNode.dataset.mapZoom = zoom.toFixed(3)
      rootNode.dataset.mapShownFrame = String(shownFrame)
      if (view) {
        drawHouses(canvasNode, view, lastFrame, houses)
        housesDrawn = true
      } else if (housesDrawn) {
        housesDrawn = false
        shownFrame = drawFrame(canvasNode, videoNode) ?? shownFrame
      }
      if (!globe) return
      // The clip shows only once the frame canvas holds one of its frames from the hand-over on;
      // until then the planet stays, at the hand-over (whose picture is that frame), so what is
      // painted and what is drawn are always the same picture, however fast the wheel turns.
      const clipReady = Boolean(view) || housesDrawn || shownFrame >= ZOOM_PATH.handFrame
      if (inClip && clipReady) {
        setMode('video')
        showClip(view)
      } else if (inClip) {
        setMode('globe')
        showPlanet(Math.min(zoom, ZOOM_HAND - 0.0001))
      } else {
        setMode('globe')
        showPlanet()
      }
    }

    const tick = (timestamp) => {
      frameId = 0
      if (cancelled) return
      const delta = lastTimestamp ? Math.min(64, timestamp - lastTimestamp) : 16
      lastTimestamp = timestamp
      let active = false
      const zoomTarget = zoomForTurn(turnTarget)
      const gap = zoomTarget - zoom
      if (Math.abs(gap) > 0.0005) {
        zoom += gap * (1 - Math.exp(-delta / ZOOM_SMOOTHING_MS))
        active = true
      } else {
        zoom = zoomTarget
      }
      if (!dragging && (Math.abs(spinYaw) > MIN_SPIN_SPEED || Math.abs(spinPitch) > MIN_SPIN_SPEED)) {
        yaw += spinYaw * delta
        pitch = clampLatitude(pitch + spinPitch * delta)
        const decay = Math.exp(-delta / SPIN_DECAY_MS)
        spinYaw *= decay
        spinPitch *= decay
        active = true
      } else if (dragging) {
        active = true
      }
      show()
      if (active) frameId = window.requestAnimationFrame(tick)
      else lastTimestamp = 0
    }

    const requestFrame = () => {
      if (!frameId && !cancelled) frameId = window.requestAnimationFrame(tick)
    }

    // Wheel, pinch and swipe all arrive here as an amount of zoom (z).
    const zoomBy = (amount) => {
      if (mode === 'loading' && globe) return
      turnTarget = Math.min(ZOOM_END + ASLANT_HOLD, Math.max(0, turnTarget + amount))
      requestFrame()
    }

    const handleWheel = (event) => {
      event.preventDefault()
      // deltaMode 1 = lines; normalize to pixels.
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      zoomBy(pixels * ZOOM_PATH.perWheelPixel)
    }

    // The planet can be dragged round only while it is at its first size.
    const canDrag = () => mode === 'globe' && zoom < 0.05

    const handlePointerDown = (event) => {
      if (!canDrag() || event.button !== 0) return
      if (event.target instanceof Element && event.target.closest('a')) return
      dragging = true
      dragPointerId = event.pointerId
      lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp }
      spinYaw = 0
      spinPitch = 0
      rootNode.classList.add('is-dragging')
      rootNode.setPointerCapture?.(event.pointerId)
      requestFrame()
    }

    const handlePointerMove = (event) => {
      if (!dragging || event.pointerId !== dragPointerId || !lastPointer) return
      const dx = event.clientX - lastPointer.x
      const dy = event.clientY - lastPointer.y
      const elapsed = Math.max(1, event.timeStamp - lastPointer.time)
      const degrees = getDragDegreesPerPixel(Math.exp(zoom), getFrameScale())
      yaw += dx * degrees
      pitch = clampLatitude(pitch + dy * degrees)
      // Speed in degrees per ms, blended so a stop before release stays a stop.
      spinYaw = clampSpin(spinYaw * 0.5 + ((dx * degrees) / elapsed) * 0.5)
      // Tilt coasts less than turning so a flick does not end up at a pole.
      spinPitch = clampSpin(spinPitch * 0.5 + ((dy * degrees) / elapsed) * 0.5) * 0.4
      lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp }
      requestFrame()
    }

    const handlePointerUp = (event) => {
      if (!dragging || event.pointerId !== dragPointerId) return
      if (lastPointer && event.timeStamp - lastPointer.time > SPIN_IDLE_MS) {
        spinYaw = 0
        spinPitch = 0
      }
      dragging = false
      dragPointerId = null
      lastPointer = null
      rootNode.classList.remove('is-dragging')
      rootNode.releasePointerCapture?.(event.pointerId)
      requestFrame()
    }

    let touchY = null
    let pinchDistance = null
    const touchDistance = (touches) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      )
    const handleTouchStart = (event) => {
      touchY = event.touches.length === 1 ? event.touches[0].clientY : null
      pinchDistance = event.touches.length === 2 ? touchDistance(event.touches) : null
    }
    const handleTouchMove = (event) => {
      if (event.touches.length === 2 && pinchDistance !== null) {
        const distance = touchDistance(event.touches)
        // Spreading the fingers zooms in.
        zoomBy((distance - pinchDistance) * PINCH_PROGRESS_PER_PIXEL * Z_PER_PROGRESS)
        pinchDistance = distance
        return
      }
      // One finger drags the planet while it can be dragged; otherwise it swipes the zoom.
      if (touchY === null || event.touches.length !== 1 || canDrag()) return
      const y = event.touches[0].clientY
      // Swipe up zooms in, like scrolling down.
      zoomBy((touchY - y) * TOUCH_PROGRESS_PER_PIXEL * Z_PER_PROGRESS)
      touchY = y
    }
    const handleTouchEnd = () => {
      touchY = null
      pinchDistance = null
    }

    const handleResize = () => {
      const state = applyCameraFrame(rootNode, nodes, progressRef.current)
      syncGlobeSize(state)
      if (globe) show()
    }

    const handleSeeked = () => {
      // past the clip's end the frame canvas holds the houses, not the clip
      if (housesDrawn) return
      shownFrame = drawFrame(canvasNode, videoNode) ?? shownFrame
      // show it with its own land and place, and start the next seek if the zoom has moved on
      if (globe && mode === 'video') show()
      requestFrame()
    }
    const handleReady = () => {
      if (cancelled) return
      setStatus('ready')
      handleResize()
      if (!housesDrawn) shownFrame = drawFrame(canvasNode, videoNode) ?? shownFrame
      if (globe && mode === 'video') globe.render()
    }
    const handleError = () => {
      if (!cancelled) setStatus('error')
    }

    const loadImage = (src, onLoad) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => {
        if (!cancelled) onLoad(image)
      }
      image.src = withVersion(assetPath(src.slice(1)))
    }
    loadImage(ZOOM_PATH.houses.lastFrame, (image) => {
      lastFrame = image
      if (housesDrawn) show()
    })
    loadImage(ZOOM_PATH.houses.src, (image) => {
      houses = featherPicture(image, HOUSES_FEATHER)
      if (housesDrawn) show()
    })

    const resizeObserver =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(handleResize)
        : null
    resizeObserver?.observe(rootNode)
    window.addEventListener('resize', handleResize)

    const readLayers = () => {
      const { mapLayerGrid, mapLayerWorld } = document.body.dataset
      globe?.setLayers({ grid: mapLayerGrid !== 'off', world: mapLayerWorld !== 'off' })
      if (globe && mode !== 'loading') show()
    }
    // Back to the first view: turned home and zoomed all the way out.
    const handleReset = () => {
      yaw = HOME_ROTATION.yaw
      pitch = HOME_ROTATION.pitch
      spinYaw = 0
      spinPitch = 0
      turnTarget = START_TURN
      requestFrame()
    }
    const handleSatellite = (event) => {
      satelliteEnabled = event.detail?.on !== false
      if (globe && mode !== 'loading') show()
    }
    window.addEventListener('map:layers', readLayers)
    window.addEventListener('map:reset', handleReset)
    window.addEventListener('map:satellite', handleSatellite)
    rootNode.addEventListener('wheel', handleWheel, { passive: false })
    rootNode.addEventListener('pointerdown', handlePointerDown)
    rootNode.addEventListener('pointermove', handlePointerMove)
    rootNode.addEventListener('pointerup', handlePointerUp)
    rootNode.addEventListener('pointercancel', handlePointerUp)
    rootNode.addEventListener('touchstart', handleTouchStart, { passive: true })
    rootNode.addEventListener('touchmove', handleTouchMove, { passive: true })
    rootNode.addEventListener('touchend', handleTouchEnd)
    rootNode.addEventListener('touchcancel', handleTouchEnd)
    videoNode.addEventListener('loadeddata', handleReady)
    videoNode.addEventListener('seeked', handleSeeked)
    videoNode.addEventListener('error', handleError)
    // The video may have loaded before hydration attached the listeners.
    if (videoNode.readyState >= 2) handleReady()
    else if (videoNode.error) handleError()

    // The planet loads on its own; until it is ready (or if WebGL is missing)
    // the wheel scrubs the clip straight away.
    import('../../lib/globe-scene.mjs')
      .then(({ createGlobe }) =>
        createGlobe(
          globeCanvasNode,
          assetPath(GLOBE.texture.slice(1)),
          assetPath(GLOBE.milkyWay.texture.slice(1)),
          ZOOM_PATH.details.map(([frame, scale, x, y]) => ({
            url: withVersion(assetPath(ZOOM_PATH.detailSrc(frame).slice(1))),
            scale,
            x,
            y,
          })),
          withVersion(assetPath(GLOBE.landTexture.slice(1))),
          withVersion(assetPath(ZOOM_PATH.clipLand.slice(1)))
        )
      )
      .then((created) => {
        if (cancelled) {
          created.dispose()
          return
        }
        globe = created
        readLayers()
        globe.setVideoSource(canvasNode)
        globeSize = ''
        handleResize()
      })
      .catch((error) => {
        // No WebGL or texture: the clip's own first frame stands in for the planet.
        console.error('globe failed to start', error)
        if (!cancelled) setMode('video')
      })

    // Coming back with the browser's Back button can restore this page from the
    // back/forward cache with a lost WebGL context and a stale clip. Start it over.
    const handlePageShow = (event) => {
      if (event.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      cancelled = true
      window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('map:layers', readLayers)
      window.removeEventListener('map:reset', handleReset)
      window.removeEventListener('map:satellite', handleSatellite)
      rootNode.removeEventListener('wheel', handleWheel)
      rootNode.removeEventListener('pointerdown', handlePointerDown)
      rootNode.removeEventListener('pointermove', handlePointerMove)
      rootNode.removeEventListener('pointerup', handlePointerUp)
      rootNode.removeEventListener('pointercancel', handlePointerUp)
      rootNode.removeEventListener('touchstart', handleTouchStart)
      rootNode.removeEventListener('touchmove', handleTouchMove)
      rootNode.removeEventListener('touchend', handleTouchEnd)
      rootNode.removeEventListener('touchcancel', handleTouchEnd)
      videoNode.removeEventListener('loadeddata', handleReady)
      videoNode.removeEventListener('seeked', handleSeeked)
      videoNode.removeEventListener('error', handleError)
      globe?.dispose()
    }
  }, [])

  return createElement(
    'div',
    {
      ref: rootRef,
      className: 'figma-home-map-engine figma-deep-zoom-map',
      'data-map-engine': 'custom-deep-zoom',
      'data-map-camera-api': 'setCameraProgress',
      'data-map-wheel': 'bound',
      'data-map-status': status,
      'data-map-mode': 'loading',
      'data-map-progress': '0.0000',
      'data-map-scale': '0.0000',
      'data-map-houses': 'inactive',
      'aria-label': '행성에서 건물 군집으로 이동하는 연속 확대 지도',
    },
    createElement(
      'div',
      { className: 'figma-deep-zoom-world', 'aria-hidden': 'true' },
      createElement('canvas', {
        ref: canvasRef,
        className: 'figma-deep-zoom-frame',
        width: ZOOM_VIDEO.bufferWidth,
        height: ZOOM_VIDEO.bufferHeight,
        style: { backgroundImage: `url(${assetPath(ZOOM_VIDEO.poster.slice(1))})` },
        'data-map-frame': 'zoom',
      }),
      createElement('canvas', {
        ref: globeCanvasRef,
        className: 'figma-deep-zoom-globe',
        style: { opacity: 0 },
        'data-map-globe': 'planet',
      }),
      createElement('video', {
        ref: videoRef,
        className: 'figma-deep-zoom-video',
        src: assetPath(ZOOM_VIDEO.src.slice(1)),
        poster: assetPath(ZOOM_VIDEO.poster.slice(1)),
        muted: true,
        playsInline: true,
        preload: 'auto',
        tabIndex: -1,
        disablePictureInPicture: true,
        'data-map-video': 'zoom',
      })
    ),
    // The two keys lie exactly over one another; progress along the clip decides
    // which shows (see MAP_LEGEND).
    ['symbols', 'numbered'].map((kind) =>
      createElement('img', {
        key: kind,
        ref: kind === 'numbered' ? legendNumberedRef : legendSymbolsRef,
        className: 'figma-deep-zoom-legend',
        src: assetPath(MAP_LEGEND[kind].slice(1)),
        alt: kind === 'numbered' ? '지도 범례' : '',
        'aria-hidden': kind === 'numbered' ? undefined : 'true',
        width: MAP_LEGEND.width,
        height: MAP_LEGEND.height,
        draggable: false,
        style: {
          left: MAP_LEGEND.left,
          top: MAP_LEGEND.top,
          height: MAP_LEGEND.heightPercent,
          opacity: kind === 'numbered' ? 0 : 1,
        },
        'data-map-legend': kind,
      })
    ),
    HOUSE_HOTSPOTS.map((house, index) =>
      createElement('span', {
        key: house.id,
        ref: (node) => {
          hotspotRefs.current[index] = node
        },
        className: `figma-deep-zoom-target-hit figma-deep-zoom-house-hit ${house.id}`,
        'aria-label': house.id,
        'data-map-house-target': house.id,
      })
    )
  )
}
