'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  GLOBE,
  HOME_ROTATION,
  HOUSE_HOTSPOTS,
  MAP_LEGEND,
  ZOOM_VIDEO,
  clampLatitude,
  clampProgress,
  easeInOut,
  getHotspotCenter,
  getDragDegreesPerPixel,
  getGlobeScale,
  getHandoffOpacity,
  getLegendNumberedOpacity,
  getVideoPlanetScale,
  getShortestYawDelta,
  getZoomAnchorTurn,
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
const MAX_SPIN_SPEED = 0.16
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
    const size = center.videoWidth * 0.037 * center.scale
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
  if (nodes.legendNumbered && nodes.legendSymbols) {
    const numbered = getLegendNumberedOpacity(progress)
    nodes.legendNumbered.style.opacity = String(numbered)
    nodes.legendSymbols.style.opacity = String(1 - numbered)
  }
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
    let globeFrameId = 0
    let targetProgress = 0
    let lastTimestamp = 0
    let globe = null
    let globeSize = ''
    // 'loading' until the planet is ready; 'globe' lets it be dragged round and
    // grown with the wheel; 'aligning' is the short turn from wherever it was
    // dragged to the home view; 'video' scrubs the zoom clip.
    let mode = 'loading'
    // 0 is the small planet in its stars, 1 the size of the clip's first frame.
    let growth = 0
    let growthTarget = 0
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
    // Where the pointer last zoomed, in video-frame pixels from the planet's
    // centre; the planet turns as it grows so that point stays under the pointer.
    let zoomAnchor = null

    const getFrameScale = () => {
      const width = globeCanvasNode.getBoundingClientRect().width
      return width > 0 ? width / ZOOM_VIDEO.width : 1
    }
    const toFramePoint = (clientX, clientY) => {
      const rect = globeCanvasNode.getBoundingClientRect()
      const scale = getFrameScale()
      return {
        x: (clientX - (rect.left + rect.width / 2)) / scale,
        y: (clientY - (rect.top + rect.height / 2)) / scale,
      }
    }

    // In 'video' mode the planet dissolves into the clip as it plays, so its
    // opacity follows the clip's progress; otherwise it is simply shown or hidden.
    let handoffHidden = false
    const updateGlobeHandoff = (progress) => {
      if (!globe) return
      const opacity = getHandoffOpacity(progress)
      if (opacity <= 0.001) {
        if (!handoffHidden) globeCanvasNode.style.opacity = '0'
        handoffHidden = true
        return
      }
      handoffHidden = false
      // The planet grows exactly as the clip's own planet does.
      globe.setScale(getVideoPlanetScale(progress))
      globe.render()
      globeCanvasNode.style.opacity = String(opacity)
    }

    const setMode = (nextMode) => {
      mode = nextMode
      rootNode.dataset.mapMode = nextMode
      // Progress drives the opacity in video mode, so it must not lag behind.
      globeCanvasNode.style.transitionDuration = nextMode === 'video' ? '0s' : ''
      if (nextMode === 'video') {
        handoffHidden = false
        updateGlobeHandoff(progressRef.current)
      } else {
        globeCanvasNode.style.opacity = nextMode === 'loading' ? '0' : '1'
      }
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
      if (mode === 'video') updateGlobeHandoff(progress)
      return state
    }

    const enterGlobeMode = (startGrowth) => {
      if (!globe) return
      yaw = HOME_ROTATION.yaw
      pitch = HOME_ROTATION.pitch
      growth = startGrowth
      growthTarget = startGrowth
      globe.setScale(getGlobeScale(growth))
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
        if (progress === 0 && mode === 'video') enterGlobeMode(1)
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

      // The planet grows towards the wheel's target, smoothed like the clip.
      const growthGap = growthTarget - growth
      const scaleBefore = getGlobeScale(growth)
      if (Math.abs(growthGap) > 0.0004) {
        growth += growthGap * (1 - Math.exp(-delta / GLOBE.zoomSmoothingMs))
        active = true
      } else {
        growth = growthTarget
      }
      const scaleAfter = getGlobeScale(growth)
      if (mode === 'globe' && zoomAnchor && scaleAfter !== scaleBefore) {
        const turn = getZoomAnchorTurn(zoomAnchor, scaleBefore, scaleAfter)
        if (turn) {
          yaw += turn.yaw
          pitch = clampLatitude(pitch + turn.pitch)
        }
      }
      globe.setScale(scaleAfter)
      rootNode.dataset.mapGrowth = growth.toFixed(3)
      rootNode.dataset.mapRotation = `${yaw.toFixed(1)} ${pitch.toFixed(1)}`

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
          targetProgress = Math.min(clampProgress(pendingZoom), GLOBE.firstStepMax)
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
      growthTarget = 1
      const yawDelta = getShortestYawDelta(yaw, HOME_ROTATION.yaw)
      if (Math.abs(yawDelta) < 0.5 && Math.abs(pitch - HOME_ROTATION.pitch) < 0.5) {
        setMode('video')
        targetProgress = Math.min(clampProgress(pendingZoom), GLOBE.firstStepMax)
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
      if (mode === 'loading') return
      if (mode === 'globe') {
        // The planet grows first; once it is the size of the clip's first
        // frame, the next step turns it to the home view and starts the clip.
        if (amount > 0 && growthTarget >= 1 && growth >= 0.99) {
          startAlign(amount)
        } else {
          growthTarget = clampProgress(
            growthTarget + amount * GLOBE.zoomPerProgress
          )
          requestGlobeFrame()
        }
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
      if (mode === 'globe') zoomAnchor = toFramePoint(event.clientX, event.clientY)
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
      const degrees = getDragDegreesPerPixel(getGlobeScale(growth), getFrameScale())
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
        if (mode === 'globe') {
          zoomAnchor = toFramePoint(
            (event.touches[0].clientX + event.touches[1].clientX) / 2,
            (event.touches[0].clientY + event.touches[1].clientY) / 2
          )
        }
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
        createGlobe(
          globeCanvasNode,
          assetPath(GLOBE.texture.slice(1)),
          assetPath(GLOBE.milkyWay.texture.slice(1))
        )
      )
      .then((created) => {
        if (cancelled) {
          created.dispose()
          return
        }
        globe = created
        handleResize()
        // Start small, in the stars, unless the clip has already been scrubbed.
        if (progressRef.current === 0 && targetProgress === 0 && mode === 'loading') {
          enterGlobeMode(0)
        } else if (mode === 'loading') {
          setMode('video')
        }
      })
      .catch(() => {
        // No WebGL or texture: the clip's own first frame stands in for the planet.
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
