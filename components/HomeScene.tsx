'use client'

import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import Image from '@/components/Image'

const houseTracks = {
  red: '/static/audio/red-house.mp3',
  white: '/static/audio/white-house.mp3',
  blue: '/static/audio/blue-house.mp3',
  yellow: '/static/audio/yellow-house.mp3',
}

const houseHotspots = [
  {
    house: 'white',
    label: 'Play white house music',
    x: 320,
    y: 545,
    width: 180,
    height: 175,
  },
  {
    house: 'yellow',
    label: 'Play yellow house music',
    x: 575,
    y: 245,
    width: 170,
    height: 225,
  },
  {
    house: 'red',
    label: 'Play red house music',
    x: 1170,
    y: 530,
    width: 150,
    height: 285,
  },
  {
    house: 'blue',
    label: 'Play blue house music',
    x: 1300,
    y: 345,
    width: 135,
    height: 165,
  },
] as const

const ridgeFlowers = [
  {
    src: '/static/images/flowers/flower-1.png',
    x: 146,
    y: 377,
    width: 44,
    height: 118,
  },
  {
    src: '/static/images/flowers/flower-2.png',
    x: 182,
    y: 377,
    width: 59,
    height: 118,
  },
  {
    src: '/static/images/flowers/flower-3.png',
    x: 228,
    y: 377,
    width: 56,
    height: 118,
  },
  {
    src: '/static/images/flowers/flower-4.png',
    x: 272,
    y: 377,
    width: 47,
    height: 118,
  },
] as const

const flowerSwayOrigin = {
  x: 232,
  y: 492,
}

const flowerSegmentCount = 7

export default function HomeScene() {
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const doorRef = useRef<HTMLAudioElement | null>(null)
  const playbackRef = useRef(0)
  const flowerSegmentRefs = useRef<Array<Array<SVGGElement | null>>>([])
  const flowerFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const music = musicRef.current
    const door = doorRef.current

    return () => {
      music?.pause()
      door?.pause()

      if (flowerFrameRef.current !== null) {
        window.cancelAnimationFrame(flowerFrameRef.current)
      }
    }
  }, [])

  async function playHouseTrack(house: keyof typeof houseTracks) {
    const music = musicRef.current
    const door = doorRef.current

    if (!music || !door) {
      return
    }

    const playback = ++playbackRef.current

    music.pause()
    music.currentTime = 0
    door.pause()
    door.currentTime = 0

    try {
      await door.play()
      await new Promise<void>((resolve) => {
        door.addEventListener('ended', () => resolve(), { once: true })
      })

      if (playback !== playbackRef.current) {
        return
      }

      music.src = houseTracks[house]
      music.currentTime = 0
      await music.play()
    } catch {
      music.pause()
      door.pause()
    }
  }

  function moveFlowers(event: ReactPointerEvent<SVGGElement>) {
    const svg = event.currentTarget.ownerSVGElement

    if (!svg) {
      return
    }

    const screenMatrix = svg.getScreenCTM()

    if (!screenMatrix) {
      return
    }

    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY

    const cursor = point.matrixTransform(screenMatrix.inverse())
    const cursorPull = Math.max(-9, Math.min(9, (cursor.x - flowerSwayOrigin.x) * 0.05))
    const now = window.performance.now()

    if (flowerFrameRef.current !== null) {
      window.cancelAnimationFrame(flowerFrameRef.current)
    }

    flowerFrameRef.current = window.requestAnimationFrame(() => {
      ridgeFlowers.forEach((pose, flowerIndex) => {
        const segments = flowerSegmentRefs.current[flowerIndex]

        if (!segments) {
          return
        }

        const phase = flowerIndex * 0.9
        const stemX = pose.x + pose.width / 2
        const stemY = pose.y + pose.height
        const cursorSway = cursorPull * (0.34 + flowerIndex * 0.04)
        const breeze = Math.sin(now / 145 + phase) * (2.2 + flowerIndex * 0.22)
        const bend = Math.sin(now / 105 + phase) * 2.3 + cursorPull * (0.14 + flowerIndex * 0.02)
        const drift = cursorPull * (0.1 + flowerIndex * 0.02)
        const rotation = cursorSway + breeze

        segments.forEach((segment, segmentIndex) => {
          if (!segment) {
            return
          }

          const flexibility = (flowerSegmentCount - segmentIndex) / flowerSegmentCount
          const easing = flexibility * flexibility

          segment.style.transition = 'transform 95ms ease-out'
          segment.style.transformBox = 'view-box'
          segment.style.transformOrigin = `${stemX}px ${stemY}px`
          segment.style.transform = [
            `translateX(${(drift * easing * 2.2).toFixed(2)}px)`,
            `rotate(${(rotation * easing).toFixed(2)}deg)`,
            `skewX(${(bend * easing).toFixed(2)}deg)`,
          ].join(' ')
        })
      })
    })
  }

  function resetFlowers() {
    if (flowerFrameRef.current !== null) {
      window.cancelAnimationFrame(flowerFrameRef.current)
    }

    flowerFrameRef.current = window.requestAnimationFrame(() => {
      flowerSegmentRefs.current.forEach((segments, flowerIndex) => {
        segments?.forEach((segment, segmentIndex) => {
          if (!segment) {
            return
          }

          segment.style.transition = `transform ${
            520 + flowerIndex * 70 + segmentIndex * 35
          }ms cubic-bezier(0.2, 0.9, 0.25, 1)`
          segment.style.transform = 'translateX(0) rotate(0deg) skewX(0deg)'
        })
      })
    })
  }

  function stopHouseTrack() {
    const music = musicRef.current
    const door = doorRef.current

    playbackRef.current += 1

    music?.pause()
    door?.pause()

    if (music) {
      music.currentTime = 0
    }

    if (door) {
      door.currentTime = 0
    }
  }

  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat sm:hidden"
        style={{
          backgroundImage: "url('/static/images/backgrounds/plaid-house-hill-portrait.png')",
        }}
      />
      <div
        className="absolute inset-0 hidden bg-cover bg-center bg-no-repeat sm:block"
        style={{
          backgroundImage:
            "url('/static/images/backgrounds/collage-hill-layout.png?v=no-flowers-final')",
        }}
      />
      <button
        type="button"
        aria-label="Stop house music"
        className="absolute inset-0 cursor-default bg-transparent outline-none focus-visible:outline-none"
        onClick={stopHouseTrack}
      />
      {/* Audio tracks are music-only interactions triggered by the house hotspots. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={musicRef} preload="auto" />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={doorRef} src="/static/audio/open-door.mp3" preload="auto" />

      <button
        type="button"
        aria-label="Play red house music"
        className="absolute top-[63%] left-[68%] h-[22%] w-[25%] cursor-pointer bg-transparent outline-none focus-visible:outline-none sm:hidden"
        onClick={() => playHouseTrack('red')}
      />

      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1672 941"
      >
        <defs>
          {ridgeFlowers.flatMap(({ x, y, width, height }, flowerIndex) =>
            Array.from({ length: flowerSegmentCount }, (_, segmentIndex) => {
              const segmentHeight = height / flowerSegmentCount

              return (
                <clipPath
                  key={`flower-${flowerIndex}-clip-${segmentIndex}`}
                  id={`flower-${flowerIndex}-clip-${segmentIndex}`}
                >
                  <rect
                    x={x - 8}
                    y={y + segmentIndex * segmentHeight - 1}
                    width={width + 16}
                    height={segmentHeight + 2}
                  />
                </clipPath>
              )
            })
          )}
        </defs>

        <g
          className="pointer-events-auto"
          onPointerEnter={moveFlowers}
          onPointerMove={moveFlowers}
          onPointerLeave={resetFlowers}
        >
          <rect x="130" y="345" width="210" height="175" fill="transparent" />
          {ridgeFlowers.map(({ src, x, y, width, height }, index) => (
            <g key={src}>
              {Array.from({ length: flowerSegmentCount }, (_, segmentIndex) => (
                <g
                  key={`${src}-${segmentIndex}`}
                  ref={(element) => {
                    flowerSegmentRefs.current[index] ??= []
                    flowerSegmentRefs.current[index][segmentIndex] = element
                  }}
                >
                  <image
                    href={src}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    preserveAspectRatio="xMidYMid meet"
                    clipPath={`url(#flower-${index}-clip-${segmentIndex})`}
                  />
                </g>
              ))}
            </g>
          ))}
        </g>

        {houseHotspots.map(({ house, label, x, y, width, height }) => (
          <foreignObject
            key={house}
            x={x}
            y={y}
            width={width}
            height={height}
            className="pointer-events-auto"
          >
            <button
              type="button"
              aria-label={label}
              className="pointer-events-auto h-full w-full cursor-pointer bg-transparent outline-none focus-visible:outline-none"
              onClick={() => playHouseTrack(house)}
            />
          </foreignObject>
        ))}
      </svg>

      <Image
        src="/static/images/collage-desk-man.png"
        alt=""
        width={1596}
        height={985}
        className="pointer-events-none absolute top-[78%] left-1/2 h-auto w-[clamp(12rem,13.5vw,15rem)] -translate-x-1/2 -translate-y-1/2 select-none sm:hidden"
      />
    </div>
  )
}
