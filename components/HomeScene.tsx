'use client'

import { useEffect, useRef, useState } from 'react'
import Image from '@/components/Image'

const houseTracks = {
  red: '/static/audio/red-house.mp3',
  white: '/static/audio/white-house.mp3',
  blue: '/static/audio/blue-house.mp3',
  yellow: '/static/audio/yellow-house.mp3',
}

const houseLabels = {
  red: '빨간 집',
  white: '하얀 집',
  blue: '파란 집',
  yellow: '노란 집',
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
  const [audioStatus, setAudioStatus] = useState('집을 클릭하거나 테스트 버튼을 눌러주세요.')

  useEffect(() => {
    const audio = audioRef.current

    return () => {
      audio?.pause()
    }
  }, [])

  async function playHouseTrack(house: keyof typeof houseTracks) {
    const audio = audioRef.current

    if (!audio) {
      setAudioStatus('오디오 플레이어를 아직 찾지 못했습니다.')
      return
    }

    audio.pause()
    audio.src = houseTracks[house]
    audio.currentTime = 0
    setAudioStatus(`${houseLabels[house]} 음악을 준비하고 있습니다.`)

    try {
      await audio.play()
      setAudioStatus(`${houseLabels[house]} 음악이 재생 중입니다.`)
    } catch (error) {
      audio.pause()
      const reason = error instanceof Error ? error.name : 'UnknownError'
      setAudioStatus(`재생이 시작되지 않았습니다. 브라우저 응답: ${reason}`)
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
      <audio
        ref={audioRef}
        controls
        preload="auto"
        className="absolute bottom-20 left-4 z-10 w-[min(22rem,calc(100vw-2rem))]"
        onEnded={() => setAudioStatus('음악 재생이 끝났습니다.')}
        onError={() => setAudioStatus('음악 파일을 불러오지 못했습니다.')}
        onPlaying={() => setAudioStatus('브라우저에서 음악 재생을 시작했습니다.')}
      />

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

      <div className="absolute bottom-4 left-4 z-10 flex w-[min(22rem,calc(100vw-2rem))] items-center gap-3 bg-white/90 p-3 text-sm text-black shadow-lg backdrop-blur-sm">
        <button
          type="button"
          className="shrink-0 bg-black px-3 py-2 text-white"
          onClick={() => playHouseTrack('red')}
        >
          음악 테스트
        </button>
        <p aria-live="polite" className="min-w-0">
          {audioStatus}
        </p>
      </div>
    </div>
  )
}
