'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
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

const flowers = [
  { id: 0, x: 140, y: 482, scale: 0.92 },
  { id: 1, x: 182, y: 482, scale: 1.08 },
  { id: 2, x: 234, y: 482, scale: 1 },
  { id: 3, x: 276, y: 482, scale: 0.96 },
] as const

const restingFlowers = flowers.map(() => ({ x: 0, y: 0, dragging: false, sway: 0 }))

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function HomeScene() {
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const doorRef = useRef<HTMLAudioElement | null>(null)
  const playbackRef = useRef(0)
  const dragRef = useRef<{ id: number; startX: number; startY: number } | null>(null)
  const [flowerPoses, setFlowerPoses] = useState(restingFlowers)

  useEffect(() => {
    const music = musicRef.current
    const door = doorRef.current

    return () => {
      music?.pause()
      door?.pause()
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

  function startFlowerDrag(id: number, event: PointerEvent<SVGGElement>) {
    dragRef.current = { id, startX: event.clientX, startY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    setFlowerPoses((poses) =>
      poses.map((pose, index) => (index === id ? { ...pose, dragging: true } : pose))
    )
  }

  function moveFlower(event: PointerEvent<SVGGElement>) {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    const x = clamp((event.clientX - drag.startX) * 0.45, -28, 28)
    const y = clamp((event.clientY - drag.startY) * 0.3, -18, 18)

    setFlowerPoses((poses) =>
      poses.map((pose, index) =>
        index === drag.id ? { ...pose, x, y, sway: pose.sway + 1 } : pose
      )
    )
  }

  function endFlowerDrag(event: PointerEvent<SVGGElement>) {
    const drag = dragRef.current

    if (!drag) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setFlowerPoses((poses) =>
      poses.map((pose, index) =>
        index === drag.id ? { x: 0, y: 0, dragging: false, sway: pose.sway + 1 } : pose
      )
    )
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
        style={{ backgroundImage: "url('/static/images/backgrounds/collage-hill-layout.png')" }}
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

      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1672 941"
        aria-hidden="true"
      >
        <defs>
          <filter id="flower-patch-soften" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        <g filter="url(#flower-patch-soften)">
          <path d="M108 388H310V464C248 466 180 470 108 474Z" fill="#a4d8f6" />
          <path d="M108 468C164 467 234 462 310 455V506H108Z" fill="#4f861f" />
        </g>
        {flowers.map(({ id, x, y, scale }) => {
          const pose = flowerPoses[id]
          const wind = Math.sin(pose.sway * 0.75 + id) * 3
          const rotate = clamp(pose.x * 0.55 + wind, -18, 18)

          return (
            <g
              key={id}
              className="pointer-events-auto cursor-grab touch-none active:cursor-grabbing"
              style={{
                transform: `translate(${x + pose.x}px, ${y + pose.y}px) scale(${scale}) rotate(${rotate}deg)`,
                transformBox: 'fill-box',
                transformOrigin: '50% 100%',
                transition: pose.dragging
                  ? 'transform 90ms ease-out'
                  : 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onPointerDown={(event) => startFlowerDrag(id, event)}
              onPointerMove={moveFlower}
              onPointerUp={endFlowerDrag}
              onPointerCancel={endFlowerDrag}
            >
              <rect x="-24" y="-88" width="48" height="96" fill="transparent" />
              <g
                fill="none"
                stroke="#e22b2d"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              >
                <path d="M0 0C-3-22 2-43 0-66" />
                <path d="M0-10C-15-28-20-43-20-55" />
                <path d="M0-12C14-28 20-43 20-55" />
                <path d="M-1-1C-14-13-22-22-25-34C-12-31-4-19-1-1Z" />
                <path d="M2 0C15-14 23-25 26-38C12-34 5-20 2 0Z" />
                <circle cx="0" cy="-68" r="7" />
                <circle cx="-11" cy="-72" r="8" />
                <circle cx="10" cy="-74" r="8" />
                <circle cx="-7" cy="-84" r="8" />
                <circle cx="7" cy="-84" r="8" />
                <circle cx="0" cy="-77" r="4" />
                <path d="M-3-55C-13-57-20-61-25-68" />
                <path d="M5-52C14-54 21-60 26-67" />
              </g>
            </g>
          )
        })}
      </svg>

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
