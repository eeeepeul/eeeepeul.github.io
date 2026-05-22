'use client'

import { useEffect, useRef } from 'react'
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

export default function HomeScene() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current

    return () => {
      audio?.pause()
    }
  }, [])

  async function playHouseTrack(house: keyof typeof houseTracks) {
    const audio = audioRef.current

    if (!audio) return

    audio.pause()
    audio.src = houseTracks[house]
    audio.currentTime = 0

    try {
      await audio.play()
    } catch {
      audio.pause()
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
        style={{ backgroundImage: "url('/static/images/backgrounds/collage-hill-layout.png')" }}
      />
      {/* Audio tracks are music-only interactions triggered by the house hotspots. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="auto" />

      <button
        type="button"
        aria-label="Play red house music"
        className="absolute top-[63%] left-[68%] h-[22%] w-[25%] cursor-pointer bg-transparent outline-none focus-visible:outline-none sm:hidden"
        onClick={() => playHouseTrack('red')}
      />

      <svg
        className="absolute inset-0 hidden h-full w-full sm:block"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1672 941"
      >
        {houseHotspots.map(({ house, label, x, y, width, height }) => (
          <foreignObject key={house} x={x} y={y} width={width} height={height}>
            <button
              type="button"
              aria-label={label}
              className="h-full w-full cursor-pointer bg-transparent outline-none focus-visible:outline-none"
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
