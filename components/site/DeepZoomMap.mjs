'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  GLOBE,
  HOME_ROTATION,
  HOUSE_HOTSPOTS,
  ZOOM_VIDEO,
  clampLatitude,
  clampProgress,
  easeInOut,
  getHotspotCenter,
  getShortestYawDelta,
  setCameraProgress,
} from '../../lib/deep-zoom-map.mjs'

const WHEEL_PROGRESS_PER_PIXEL = 1 / 2800
const TOUCH_PROGRESS_PER_PIXEL = 1 / 600
const PINCH_PROGRESS_PER_PIXEL = 1 / 500
const WHEEL_SMOOTHING_MS = 180
// Skip seeks smaller than a few frames' worth of drift to keep scrubbing cheap.
const MIN_SEEK_SECONDS = 1 / 60
// How quickly a released drag stops spinning (ms for the speed to fall by 1/e).
const SPIN_DECAY_MS = 260
const MIN_SPIN_SPEED = 0.002
// Fastest a released drag may keep spinning, in degrees per ms.
const MAX_SPIN_SPEED = 0.12
// Progress below this snaps to zero when zooming back out.
const MIN_PROGRESS = 0.004
// A drag that paused this long before release does not coast.
const SPIN_IDLE_MS = 90

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
function drawFrame(canvasNode, videoNode) {
  if (!canvasNode || !videoNode || videoNode.readyState < 2) return
  const context = canvasNode.getContext('2d')
  context?.drawImage(videoNode, 0, 0, canvasNode.width, canvasNode.height)
}

function setHotspotGeometry(hotspotNodes, state) {
  hotspotNodes.forEach((node, index) => {
    if (!node) return
    const center = getHotspotCenter(state, HOUSE_HOTSPOTS[index])
    const size = center.videoWidth * 0.045
    node.style.left = `${center.x}px`
    node.style.top = `${center.y}px`
    node.style.width = `${size}px`
    node.style.height = `${size}px`
  })
}

function applyCameraFrame(rootNode, nodes, progress) {
  if (!rootNode) return null

  const rect = rootNode.getBoundingClientRect()
  const state = setCameraProgress(progress, {
    width: rect.width,
    height: rect.height,
  })

  setFrameGeometry(nodes.canvas, state)
  setFrameGeometry(nodes.globeCanvas, state)
  setHotspotGeometry(nodes.hotspots, state)
  if (nodes.video && Math.abs(nodes.video.currentTime - state.time) > MIN_SEEK_SECONDS) {
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
    }

    let cancelled = false
    let frameId = 0
    let globeFrameId = 0
    let targetProgress = 0
    let lastTimestamp = 0
    let globe = null
    let globeSize = ''
    // 'video' scrubs the zoom clip; 'globe' lets the planet be dragged round;
    // 'aligning' is the short turn from wherever it was dragged to the home view.
    let mode = 'video'
    let yaw = HOME_ROTATION.yaw
    let pitch = HOME_ROTATION.pitch
    let spinYaw = 0
    let spinPitch = 0
    let dragging = false
    let dragPointerId = null
    let lastPointer = null
    let align = null
    let pendingZoom = 0
    let globeTimestamp = 0

    const setMode = (nextMode) => {
      mode = nextMode
      rootNode.dataset.mapMode = nextMode
      globeCanvasNode.classList.toggle('is-hidden', nextMode === 'video')
    }

    const syncGlobeSize = (state) => {
      if (!globe || !state) return
      const key = `${Math.round(state.video.width)}x${Math.round(state.video.height)}`
      if (key === globeSize) return
      globeSize = key
      globe.setSize(state.video.width, state.video.height)
      globe.render()
    }

    const renderVideoFrame = (progress) => {
      const state = applyCameraFrame(rootNode, nodes, progress)
      syncGlobeSize(state)
      return state
    }

    const enterGlobeMode = () => {
      if (!globe) return
      yaw = HOME_ROTATION.yaw
      pitch = HOME_ROTATION.pitch
      globe.setRotation(yaw, pitch)
      globe.render()
      setMode('globe')
    }

    const renderVideo = (timestamp) => {
      frameId = 0
      if (cancelled) return
      const delta = lastTimestamp ? Math.min(64, timestamp - lastTimestamp) : 16
      lastTimestamp = timestamp
      // Frame-rate independent smoothing toward the wheel-driven target.
      const smoothing = 1 - Math.exp(-delta / WHEEL_SMOOTHING_MS)
      const gap = targetProgress - progressRef.current
      const progress =
        Math.abs(gap) < 0.0002 ? targetProgress : progressRef.current + gap * smoothing
      progressRef.current = progress
      renderVideoFrame(progress)
      if (progress !== targetProgress) {
        frameId = window.requestAnimationFrame(renderVideo)
      } else {
        lastTimestamp = 0
        // Zoomed all the way back out: hand the planet back to the pointer.
        if (progress === 0 && mode === 'video') enterGlobeMode()
      }
    }

    const requestVideoFrame = () => {
      if (!frameId && !cancelled) frameId = window.requestAnimationFrame(renderVideo)
    }

    const renderGlobe = (timestamp) => {
      globeFrameId = 0
      if (cancelled || !globe) return
      const delta = globeTimestamp ? Math.min(64, timestamp - globeTimestamp) : 16
      globeTimestamp = timestamp
      let active = false

      if (mode === 'aligning' && align) {
        if (align.start === null) align.start = timestamp
        const amount = (timestamp - align.start) / GLOBE.alignMs
        const eased = easeInOut(amount)
        yaw = align.fromYaw + (align.toYaw - align.fromYaw) * eased
        pitch = align.fromPitch + (align.toPitch - align.fromPitch) * eased
        if (amount >= 1) {
          yaw = HOME_ROTATION.yaw
          pitch = HOME_ROTATION.pitch
          align = null
          setMode('video')
          targetProgress = clampProgress(pendingZoom)
          pendingZoom = 0
          requestVideoFrame()
        } else {
          active = true
        }
      } else if (!dragging && (Math.abs(spinYaw) > MIN_SPIN_SPEED || Math.abs(spinPitch) > MIN_SPIN_SPEED)) {
        yaw += spinYaw * delta
        pitch = clampLatitude(pitch + spinPitch * delta)
        const decay = Math.exp(-delta / SPIN_DECAY_MS)
        spinYaw *= decay
        spinPitch *= decay
        active = true
      } else if (dragging) {
        active = true
      }

      globe.setRotation(yaw, pitch)
      globe.render()
      if (active) globeFrameId = window.requestAnimationFrame(renderGlobe)
      else globeTimestamp = 0
    }

    const requestGlobeFrame = () => {
      if (!globeFrameId && !cancelled && globe) {
        globeFrameId = window.requestAnimationFrame(renderGlobe)
      }
    }

    const startAlign = (amount) => {
      pendingZoom = Math.max(0, amount)
      spinYaw = 0
      spinPitch = 0
      const yawDelta = getShortestYawDelta(yaw, HOME_ROTATION.yaw)
      if (Math.abs(yawDelta) < 0.5 && Math.abs(pitch - HOME_ROTATION.pitch) < 0.5) {
        setMode('video')
        targetProgress = clampProgress(pendingZoom)
        pendingZoom = 0
        requestVideoFrame()
        return
      }
      align = {
        start: null,
        fromYaw: yaw,
        toYaw: yaw + yawDelta,
        fromPitch: pitch,
        toPitch: HOME_ROTATION.pitch,
      }
      setMode('aligning')
      requestGlobeFrame()
    }

    // Wheel, pinch and swipe all arrive here as a signed amount of zoom.
    const zoomBy = (amount) => {
      if (mode === 'globe') {
        if (amount > 0) startAlign(amount)
      } else if (mode === 'aligning') {
        pendingZoom = Math.max(0, pendingZoom + amount)
      } else {
        targetProgress = clampProgress(targetProgress + amount)
        // Close enough to the start counts as the start, so the planet returns.
        if (targetProgress < MIN_PROGRESS) targetProgress = 0
        requestVideoFrame()
      }
    }

    const handleWheel = (event) => {
      event.preventDefault()
      // deltaMode 1 = lines; normalize to pixels.
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      zoomBy(pixels * WHEEL_PROGRESS_PER_PIXEL)
    }

    const handlePointerDown = (event) => {
      if (mode !== 'globe' || event.button !== 0) return
      if (event.target instanceof Element && event.target.closest('a')) return
      dragging = true
      dragPointerId = event.pointerId
      lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp }
      spinYaw = 0
      spinPitch = 0
      rootNode.classList.add('is-dragging')
      rootNode.setPointerCapture?.(event.pointerId)
      requestGlobeFrame()
    }

    const handlePointerMove = (event) => {
      if (!dragging || event.pointerId !== dragPointerId || !lastPointer) return
      const dx = event.clientX - lastPointer.x
      const dy = event.clientY - lastPointer.y
      const elapsed = Math.max(1, event.timeStamp - lastPointer.time)
      const degrees = GLOBE.dragDegreesPerPixel
      yaw += dx * degrees
      pitch = clampLatitude(pitch + dy * degrees)
      // Speed in degrees per ms, blended so a stop before release stays a stop.
      spinYaw = clampSpin(spinYaw * 0.5 + ((dx * degrees) / elapsed) * 0.5)
      // Tilt coasts less than turning so a flick does not end up at a pole.
      spinPitch = clampSpin(spinPitch * 0.5 + ((dy * degrees) / elapsed) * 0.5) * 0.4
      lastPointer = { x: event.clientX, y: event.clientY, time: event.timeStamp }
      requestGlobeFrame()
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
      requestGlobeFrame()
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
        zoomBy((distance - pinchDistance) * PINCH_PROGRESS_PER_PIXEL)
        pinchDistance = distance
        return
      }
      // One finger drags the planet; once zooming, it swipes along the clip.
      if (touchY === null || event.touches.length !== 1 || mode === 'globe') return
      const y = event.touches[0].clientY
      // Swipe up zooms in, like scrolling down.
      zoomBy((touchY - y) * TOUCH_PROGRESS_PER_PIXEL)
      touchY = y
    }
    const handleTouchEnd = () => {
      touchY = null
      pinchDistance = null
    }

    const handleResize = () => {
      const state = applyCameraFrame(rootNode, nodes, progressRef.current)
      syncGlobeSize(state)
    }

    const handleSeeked = () => drawFrame(canvasNode, videoNode)
    const handleReady = () => {
      if (cancelled) return
      setStatus('ready')
      handleResize()
      drawFrame(canvasNode, videoNode)
    }
    const handleError = () => {
      if (!cancelled) setStatus('error')
    }

    const resizeObserver =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(handleResize)
        : null
    resizeObserver?.observe(rootNode)
    window.addEventListener('resize', handleResize)
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
        createGlobe(globeCanvasNode, assetPath(GLOBE.texture.slice(1)))
      )
      .then((created) => {
        if (cancelled) {
          created.dispose()
          return
        }
        globe = created
        handleResize()
        // Wait for the video geometry so the planet is sized before it shows.
        if (progressRef.current === 0 && targetProgress === 0 && mode === 'video') {
          enterGlobeMode()
        }
      })
      .catch(() => {
        // No WebGL or texture: the clip's own first frame stands in for the planet.
      })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
      window.cancelAnimationFrame(globeFrameId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
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
      'data-map-mode': 'video',
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
        width: ZOOM_VIDEO.width,
        height: ZOOM_VIDEO.height,
        style: { backgroundImage: `url(${assetPath(ZOOM_VIDEO.poster.slice(1))})` },
        'data-map-frame': 'zoom',
      }),
      createElement('canvas', {
        ref: globeCanvasRef,
        className: 'figma-deep-zoom-globe is-hidden',
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
    HOUSE_HOTSPOTS.map((house, index) =>
      createElement('a', {
        key: house.id,
        ref: (node) => {
          hotspotRefs.current[index] = node
        },
        className: `figma-deep-zoom-target-hit figma-deep-zoom-house-hit ${house.id}`,
        href: `${assetPath('experience')}/?house=${house.id}`,
        'aria-label': `${house.id} CCTV 보기`,
        'data-map-house-target': house.id,
      })
    )
  )
}
