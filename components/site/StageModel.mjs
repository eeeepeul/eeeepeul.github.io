'use client'

import { createElement, useEffect, useRef } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// Box 6 of the second pages: the supplied model of the house made of red and ivory particles
// (media/red-particle-house.glb), turning slowly about its upright axis, a full turn in TURN_SECONDS.
// The particles are drawn in their own colours with no light (as they were made), and the black volume inside the house
// stays black, so the particles on the far side are hidden behind it. The model is loaded once the page is up, so it does
// not hold up the first screen.
const TURN_SECONDS = 24
const LOOK_DOWN = 0.32 // radians the view is raised above level
const FRAME_MS = 33

export function StageModel({ src = 'media/red-particle-house.glb' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let cancelled = false
    let frame = 0
    let stop = () => {}

    const start = async () => {
      const [THREE, { GLTFLoader }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
      ])
      if (cancelled) return
      const gltf = await new GLTFLoader().loadAsync(assetPath(src))
      if (cancelled) return

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      const scene = new THREE.Scene()
      const model = gltf.scene
      const materials = []
      model.traverse((node) => {
        if (!node.isMesh) return
        const coloured = Boolean(node.geometry.attributes.color)
        const material = coloured
          ? new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
          : new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
        node.material = material
        materials.push(material)
      })
      // stand the house on its middle, so it turns in place
      const box = new THREE.Box3().setFromObject(model)
      const centre = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      model.position.sub(centre)
      const pivot = new THREE.Group()
      pivot.add(model)
      scene.add(pivot)

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
      const radius = 0.5 * Math.hypot(size.x, size.y, size.z)
      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
        renderer.setSize(rect.width, rect.height, false)
        camera.aspect = rect.width / rect.height
        // the house as large as the box allows: the sphere round it is a little larger than the house seen from any side
        const fit = Math.min(camera.fov, (2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect) * 180) / Math.PI)
        const distance = (radius * 0.9) / Math.sin((fit * Math.PI) / 360)
        camera.position.set(0, Math.sin(LOOK_DOWN) * distance, Math.cos(LOOK_DOWN) * distance)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(canvas)
      resize()

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const begin = performance.now()
      let last = 0
      const draw = (now) => {
        frame = window.requestAnimationFrame(draw)
        if (now - last < FRAME_MS) return
        last = now
        pivot.rotation.y = reduced ? 0 : (((now - begin) / 1000 / TURN_SECONDS) % 1) * Math.PI * 2
        renderer.render(scene, camera)
      }
      frame = window.requestAnimationFrame(draw)
      canvas.dataset.ready = 'true'

      stop = () => {
        observer.disconnect()
        model.traverse((node) => node.isMesh && node.geometry.dispose())
        materials.forEach((material) => material.dispose())
        renderer.dispose()
      }
    }

    // after the first screen is up
    const timer = window.setTimeout(() => {
      start().catch(() => {})
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frame)
      stop()
    }
  }, [src])

  return createElement('canvas', {
    ref: canvasRef,
    className: 'stage-model',
    role: 'img',
    'aria-label': '빨간 입자로 된 집, 천천히 돈다',
  })
}
