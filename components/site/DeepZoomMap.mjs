'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import {
  DEEP_ZOOM_CONFIG,
  MAP_LEVELS,
  getCameraState,
  getLevelRegistration,
  setCameraProgress,
} from '../../lib/deep-zoom-map.mjs'

const DEBUG_MAP_ALIGNMENT = process.env.NEXT_PUBLIC_DEBUG_MAP_ALIGNMENT === 'true'
const HOUSE_HOTSPOTS = Object.freeze([
  { id: 'house1', x: 35, y: 42 },
  { id: 'house2', x: 50, y: 42 },
  { id: 'house3', x: 65, y: 42 },
  { id: 'house4', x: 50, y: 59 },
])

function setLayerGeometry(layerNode, level, state, calibration) {
  if (!layerNode) return

  const registration = getLevelRegistration(level, state.viewport)
  layerNode.style.left = `${registration.left}px`
  layerNode.style.top = `${registration.top}px`
  layerNode.style.width = `${registration.width}px`
  layerNode.style.height = `${registration.height}px`
  layerNode.style.transform = `rotate(${level.rotation + calibration.rotation}deg)`
  layerNode.style.visibility = state.activeLevel === level.id ? 'visible' : 'hidden'
}

function applyCameraFrame(rootNode, worldNode, layerNodes, progress, calibration = {}) {
  if (!rootNode || !worldNode) return null

  const rect = rootNode.getBoundingClientRect()
  const state = setCameraProgress(progress, {
    width: rect.width,
    height: rect.height,
  })

  const calibrationScale = calibration.scale ?? 1
  worldNode.style.transform = `translate3d(${state.cameraX + (calibration.offsetX ?? 0)}px, ${state.cameraY + (calibration.offsetY ?? 0)}px, 0) scale(${state.cameraScale * calibrationScale})`
  for (const [index, level] of MAP_LEVELS.entries()) {
    setLayerGeometry(layerNodes[index], level, state, calibration)
  }

  rootNode.dataset.mapProgress = state.progress.toFixed(4)
  rootNode.dataset.mapScale = state.scale.toFixed(4)
  rootNode.dataset.mapCameraScale = state.cameraScale.toFixed(4)
  rootNode.dataset.mapCameraX = state.cameraX.toFixed(2)
  rootNode.dataset.mapCameraY = state.cameraY.toFixed(2)
  rootNode.dataset.mapActiveLevel = state.activeLevel
  rootNode.dataset.mapTargetScreen = `${state.targetScreen.x.toFixed(2)} ${state.targetScreen.y.toFixed(2)}`
  rootNode.dataset.mapViewportCenter = `${state.viewportCenter.x.toFixed(2)} ${state.viewportCenter.y.toFixed(2)}`
  return state
}

function preloadLevel(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(src)
    image.onerror = reject
    image.src = src
  })
}

export function DeepZoomMap() {
  const rootRef = useRef(null)
  const worldRef = useRef(null)
  const layerRefs = useRef([])
  const progressRef = useRef(0)
  const calibrationRef = useRef({ offsetX: 0, offsetY: 0, scale: 1, rotation: 0 })
  const debugReadoutRef = useRef(null)
  const [debugVersion, setDebugVersion] = useState(0)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const rootNode = rootRef.current
    const worldNode = worldRef.current
    if (!rootNode || !worldNode) return undefined

    let cancelled = false
    let frameId = 0
    let startTime = 0
    let lastState = getCameraState(0, {
      width: rootNode.clientWidth,
      height: rootNode.clientHeight,
    })

    const render = (timestamp) => {
      if (cancelled) return
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(1, elapsed / DEEP_ZOOM_CONFIG.durationMs)
      progressRef.current = progress
      lastState = applyCameraFrame(
        rootNode,
        worldNode,
        layerRefs.current,
        progress,
        calibrationRef.current
      )
      if (DEBUG_MAP_ALIGNMENT && debugReadoutRef.current && lastState) {
        debugReadoutRef.current.textContent = `progress ${lastState.progress.toFixed(3)} · cameraScale ${lastState.cameraScale.toFixed(2)} · cameraX ${lastState.cameraX.toFixed(1)} · cameraY ${lastState.cameraY.toFixed(1)} · active ${lastState.activeLevel} · target ${lastState.targetScreen.x.toFixed(1)}, ${lastState.targetScreen.y.toFixed(1)} · center ${lastState.viewportCenter.x.toFixed(1)}, ${lastState.viewportCenter.y.toFixed(1)}`
      }
      if (progress < 1) frameId = window.requestAnimationFrame(render)
    }

    const handleResize = () => {
      lastState = applyCameraFrame(
        rootNode,
        worldNode,
        layerRefs.current,
        progressRef.current,
        calibrationRef.current
      )
    }

    const handleKeyDown = (event) => {
      if (!DEBUG_MAP_ALIGNMENT) return
      const step = event.shiftKey ? 10 : 2
      const calibration = calibrationRef.current
      if (event.key === 'ArrowLeft') calibration.offsetX -= step
      else if (event.key === 'ArrowRight') calibration.offsetX += step
      else if (event.key === 'ArrowUp') calibration.offsetY -= step
      else if (event.key === 'ArrowDown') calibration.offsetY += step
      else if (event.key === '[') calibration.rotation -= 0.5
      else if (event.key === ']') calibration.rotation += 0.5
      else return
      event.preventDefault()
      setDebugVersion((version) => version + 1)
      handleResize()
    }

    const resizeObserver =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(handleResize)
        : null
    resizeObserver?.observe(rootNode)
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)

    Promise.all(
      MAP_LEVELS.map((level) => preloadLevel(assetPath(level.src.slice(1))))
    )
      .then(() => {
        if (cancelled) return
        setStatus('ready')
        handleResize()
        frameId = window.requestAnimationFrame(render)
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return createElement(
    'div',
    {
      ref: rootRef,
      className: 'figma-home-map-engine figma-deep-zoom-map',
      'data-map-engine': 'custom-deep-zoom',
      'data-map-camera-api': 'setCameraProgress',
      'data-map-wheel': 'reserved-for-scroll-binding',
      'data-map-status': status,
      'data-map-progress': '0.0000',
      'data-map-scale': String(DEEP_ZOOM_CONFIG.initialScale),
      'data-map-camera-scale': String(DEEP_ZOOM_CONFIG.initialScale),
      'data-map-camera-x': '0.00',
      'data-map-camera-y': '0.00',
      'data-map-active-level': 'level-0',
      'data-map-debug': DEBUG_MAP_ALIGNMENT ? 'true' : 'false',
      'aria-label': '커스텀 지도에서 건물 군집으로 이동하는 연속 확대 지도',
    },
    createElement(
      'div',
      { ref: worldRef, className: 'figma-deep-zoom-world', 'aria-hidden': 'true' },
      MAP_LEVELS.map((level, index) =>
        createElement('img', {
          key: level.id,
          ref: (node) => {
            layerRefs.current[index] = node
          },
          className: 'figma-deep-zoom-layer',
          src: assetPath(level.src.slice(1)),
          alt: '',
          draggable: false,
          decoding: 'async',
          loading: index === 0 ? 'eager' : 'lazy',
          'data-map-level': level.id,
        })
      )
    ),
    HOUSE_HOTSPOTS.map((house) =>
      createElement('a', {
        key: house.id,
        className: `figma-deep-zoom-target-hit figma-deep-zoom-house-hit ${house.id}`,
        href: `${assetPath('experience')}/?house=${house.id}`,
        'aria-label': `${house.id} CCTV 보기`,
        'data-map-house-target': house.id,
        style: { left: `${house.x}%`, top: `${house.y}%` },
      })
    ),
    DEBUG_MAP_ALIGNMENT
      ? createElement(
          'aside',
          { className: 'figma-deep-zoom-debug', 'aria-label': '지도 정렬 디버그' },
          createElement('strong', null, 'DEEP ZOOM ALIGNMENT'),
          createElement('span', { ref: debugReadoutRef }, 'camera is initializing'),
          createElement('span', { className: 'figma-deep-zoom-debug-crosshair', 'aria-hidden': 'true' }),
          createElement('span', { className: 'figma-deep-zoom-debug-target', 'aria-hidden': 'true' }),
          createElement('span', null, 'Target remains at viewport center'),
          createElement(
            'span',
            { key: `calibration-${debugVersion}` },
            `offset ${calibrationRef.current.offsetX}, ${calibrationRef.current.offsetY} · rotation ${calibrationRef.current.rotation}°`
          ),
          createElement('span', null, 'Arrow keys nudge · [ ] rotate · Shift = 10px'),
          createElement(
            'button',
            {
              type: 'button',
              onClick: () => {
                const config = JSON.stringify(calibrationRef.current, null, 2)
                if (navigator.clipboard?.writeText) navigator.clipboard.writeText(config)
              },
            },
            'Copy Config'
          )
        )
      : null
  )
}
