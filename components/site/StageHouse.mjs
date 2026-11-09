'use client'

import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { HOUSE_ASPECT, HOUSE_OUTLINE } from '../../lib/house-outline.mjs'

// The black house of the supplied picture (its outline traced) standing in a corner of the player strip,
// as a solid with a depth of its own, turning slowly about its upright axis: a full turn in TURN_SECONDS.
// It is drawn in one pure black with no light and no perspective, so it reads as a 2D silhouette whose
// shape changes as the solid turns (it never thins to a line, as a flat sheet would).
// It is also the house button: pressed, it goes to the second page (second/), where the house button of the
// map page always went.
const TURN_SECONDS = 16
const DEPTH = 0.7 // how deep the house is, against its width (as in the supplied 3D model)
const LOOK_DOWN = 0.09 // radians the view is raised above level, so the roof's top shows a little

export function StageHouse() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let cancelled = false
    let frame = 0
    let stop = () => {}

    import('three').then((THREE) => {
      if (cancelled) return
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setClearColor(0x000000, 0)
      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20)

      const shape = new THREE.Shape()
      HOUSE_OUTLINE.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
      shape.closePath()
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: false, curveSegments: 1 })
      geometry.translate(-0.5, -HOUSE_ASPECT / 2, -DEPTH / 2)
      const material = new THREE.MeshBasicMaterial({ color: 0x0a1d21 })
      const house = new THREE.Mesh(geometry, material)
      scene.add(house)
      camera.position.set(0, Math.sin(LOOK_DOWN) * 6, Math.cos(LOOK_DOWN) * 6)
      camera.lookAt(0, 0, 0)

      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
        renderer.setSize(rect.width, rect.height, false)
        const aspect = rect.width / rect.height
        // the whole house in the box, turned any way (half the diagonal of its footprint is how far
        // it reaches sideways), with a little air round it
        const sweep = 0.5 * Math.hypot(1, DEPTH)
        const halfHeight = Math.max((HOUSE_ASPECT / 2 + 0.08) * 1.1, (sweep * 1.08) / aspect)
        camera.left = -halfHeight * aspect
        camera.right = halfHeight * aspect
        camera.top = halfHeight
        camera.bottom = -halfHeight
        camera.updateProjectionMatrix()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(canvas)
      resize()

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const start = performance.now()
      const draw = (now) => {
        frame = window.requestAnimationFrame(draw)
        house.rotation.y = reduced ? 0 : (((now - start) / 1000 / TURN_SECONDS) % 1) * Math.PI * 2
        renderer.render(scene, camera)
      }
      frame = window.requestAnimationFrame(draw)

      stop = () => {
        observer.disconnect()
        geometry.dispose()
        material.dispose()
        renderer.dispose()
      }
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      stop()
    }
  }, [])

  return createElement(
    'a',
    { className: 'stage-house', href: `${assetPath('second')}/`, 'aria-label': '두 번째 화면으로 이동' },
    createElement('canvas', { ref: canvasRef, className: 'stage-house__canvas', 'aria-hidden': 'true' })
  )
}
