'use client'

import { PointerEvent, WheelEvent, useEffect, useRef, useState } from 'react'
import styles from './epeul.module.css'

type View = 'home' | 'music' | 'about'
type ActiveView = View | null

const tracks = [
  { index: '1', title: '9+1', duration: '02:18', src: '/static/audio/epeul/track01.mp3' },
  { index: '2', title: 'if and only if', duration: '04:24', src: '/static/audio/epeul/track02.mp3' },
  { index: '3', title: 'saffron', duration: '03:15', src: '/static/audio/epeul/track03.mp3' },
  { index: '4', title: 'a&d', duration: '03:17', src: '/static/audio/epeul/track04.mp3' },
]

const categories: Array<{ label: string; view: View }> = [
  { label: 'MH:M', view: 'home' },
  { label: 'About', view: 'about' },
  { label: '無sic', view: 'music' },
]

const figureSlides = Array.from(
  { length: 10 },
  () => '/static/images/epeul/example-image-01.png'
)

const homeCaption = [
  'MIBALHWA HAUS : MOOEEMEE',
  'MH:M은 이플의 첫 앨범 〈mooeemee〉가 하나의 집처럼 열리는 웹 공간이다.',
  '말이 되지 못한, 미발화된 감정들이 음악으로 머무는 곳.',
]

const aboutCaptionGroups = [
  [
    'EPEUL은 가사 없는 딥하우스 음악을 만드는 VJ 아티스트이다.',
    '선명한 언어 대신 반복되는 리듬과 겹겹의 사운드로\n쉽게 설명되지 않는 감정들을 음악에 담아낸다.',
    'EPEUL은 찬란하게 피어나는 순간보다,\n그 아래에서 오래 버티고 남아 있는 것들에 더 가까이 선다.',
  ],
  [
    '이플의 첫 앨범 〈mooeemee〉는\n‘無의미’를 ‘무의 美’로 다시 읽는 이름이다.',
    '의미 없다고 생각했던 것,\n혹은 드러나지 않은 것 안에서 발견하는 아름다움을 담고 있다.',
  ],
  ['instagram @eeeepeul\nEPEUL@ 仮想アーティスト  MH :M©\nSEOUL, KR\n03:15'],
]

const progressTrackWidth = 78
const progressKnobSize = 8
const progressHitSlop = 10
const progressTravel = progressTrackWidth - progressKnobSize
const typingBaseDelay = 26

function visibleTypingText(text: string, visibleCharacters: number) {
  let remainingCharacters = visibleCharacters

  return text.split('\n').map((line) => {
    const visibleLine = line.slice(0, Math.max(0, remainingCharacters))
    remainingCharacters -= line.length
    return visibleLine
  })
}

function typingTextLength(text: string) {
  return text.replace(/\n/g, '').length
}

function typingCharacterAt(texts: string[], typedIndex: number) {
  let remainingCharacters = typedIndex

  for (const text of texts) {
    for (const character of text) {
      if (character === '\n') {
        continue
      }

      if (remainingCharacters === 0) {
        return character
      }

      remainingCharacters -= 1
    }
  }

  return ''
}

function nextTypingDelay(texts: string[], typedIndex: number) {
  const character = typingCharacterAt(texts, typedIndex)
  const jitter = (typedIndex * 37) % 42
  const pause =
    character === ' '
      ? 18
      : /[.,:;!?〉》)’”]/.test(character)
        ? 86
        : /[〈《(‘“]/.test(character)
          ? 34
          : 0

  return typingBaseDelay + jitter + pause
}

function renderTypingBlock(text: string, visibleCharacters: number, className: string) {
  const visibleLines = visibleTypingText(text, visibleCharacters)
  const lastVisibleLineIndex = visibleLines.findLastIndex((line) => line.length > 0)
  const typedLines = lastVisibleLineIndex === -1 ? [] : visibleLines.slice(0, lastVisibleLineIndex + 1)

  if (typedLines.length === 0) {
    return null
  }

  return (
    <span className={className}>
      {typedLines.map((line, index, lines) => (
        <span key={`${text}-${index}`}>
          {line}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  )
}

function renderStaticBlock(text: string, className: string) {
  return (
    <span className={className}>
      {text.split('\n').map((line, index, lines) => (
        <span key={`${text}-${index}`}>
          {line}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  )
}

export default function EpeulExperience() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const pendingSeekRef = useRef<number | null>(null)
  const progressTrackRef = useRef<HTMLButtonElement>(null)
  const isProgressDraggingRef = useRef(false)
  const [view, setView] = useState<ActiveView>(null)
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cursor, setCursor] = useState({ x: -40, y: -40 })
  const [typedCharacters, setTypedCharacters] = useState(0)
  const [figureIndex, setFigureIndex] = useState(0)
  const [previousFigureIndex, setPreviousFigureIndex] = useState<number | null>(null)
  const [figureDirection, setFigureDirection] = useState<1 | -1>(1)
  const lastFigureWheelRef = useRef(0)
  const figureDragStartXRef = useRef<number | null>(null)

  const activeCaption =
    view === 'home' ? homeCaption : view === 'about' ? aboutCaptionGroups.flat() : []
  const activeCaptionLength = activeCaption.reduce((total, text) => total + typingTextLength(text), 0)

  function clearSelection() {
    audioRef.current?.pause()
    setView(null)
    setSelectedTrack(null)
    setIsPlaying(false)
    setProgress(0)
  }

  function selectView(nextView: View) {
    if (view === nextView) {
      clearSelection()
      return
    }

    audioRef.current?.pause()
    setView(nextView)
    setSelectedTrack(null)
    setIsPlaying(false)
    setProgress(0)
  }

  function selectTrack(trackIndex: string) {
    if (view !== 'music') {
      return
    }

    playTrack(trackIndex, true)
  }

  function playTrack(trackIndex: string, allowToggleOff = false) {
    const audio = audioRef.current
    const track = tracks.find((item) => item.index === trackIndex)

    if (allowToggleOff && view === 'music' && selectedTrack === trackIndex) {
      audio?.pause()
      setSelectedTrack(null)
      setIsPlaying(false)
      setProgress(0)
      return
    }

    setView('music')
    setSelectedTrack(trackIndex)
    setIsPlaying(true)
    setProgress(0)

    if (audio && track) {
      audio.src = track.src
      audio.currentTime = 0
      audio.play().catch(() => setIsPlaying(false))
    }
  }

  function playNextTrack() {
    const currentTrackIndex = tracks.findIndex((track) => track.index === selectedTrack)
    const nextTrack = tracks[(currentTrackIndex + 1) % tracks.length] ?? tracks[0]

    playTrack(nextTrack.index)
  }

  function playAdjacentTrack(direction: 1 | -1) {
    if (view !== 'music') {
      return
    }

    const currentTrackIndex = tracks.findIndex((track) => track.index === selectedTrack)
    const startIndex = direction === 1 ? 0 : tracks.length - 1
    const nextIndex =
      currentTrackIndex === -1
        ? startIndex
        : (currentTrackIndex + direction + tracks.length) % tracks.length

    playTrack(tracks[nextIndex].index)
  }

  function togglePlayback() {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
  }

  function skipPlayback(seconds: number) {
    const audio = audioRef.current

    if (!audio?.duration || !Number.isFinite(audio.duration)) {
      return
    }

    const nextTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds))
    audio.currentTime = nextTime
    setProgress((nextTime / audio.duration) * 100)
  }

  function updatePlaybackProgress(nextProgress: number) {
    const clampedProgress = Math.max(0, Math.min(100, nextProgress))
    const audio = audioRef.current

    setProgress(clampedProgress)

    if (audio?.duration && Number.isFinite(audio.duration)) {
      audio.currentTime = audio.duration * (clampedProgress / 100)
      pendingSeekRef.current = null
      return
    }

    pendingSeekRef.current = clampedProgress
  }

  function updateProgressFromClientX(clientX: number) {
    const progressTrack = progressTrackRef.current

    if (!progressTrack) {
      return
    }

    const bounds = progressTrack.getBoundingClientRect()
    const knobHalf = progressKnobSize / 2
    const pointerX = clientX - bounds.left - progressHitSlop - knobHalf
    const nextProgress = (pointerX / progressTravel) * 100
    updatePlaybackProgress(nextProgress)
  }

  function moveFigure(direction: 1 | -1) {
    setFigureIndex((current) => {
      setPreviousFigureIndex(current)
      setFigureDirection(direction)
      return (current + direction + figureSlides.length) % figureSlides.length
    })
  }

  function scrollFigure(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault()

    const now = Date.now()

    if (now - lastFigureWheelRef.current < 520 || Math.abs(event.deltaY) < 8) {
      return
    }

    lastFigureWheelRef.current = now
    moveFigure(event.deltaY > 0 ? 1 : -1)
  }

  function startFigureDrag(event: PointerEvent<HTMLDivElement>) {
    figureDragStartXRef.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function dragFigure(event: PointerEvent<HTMLDivElement>) {
    const startX = figureDragStartXRef.current

    if (startX === null) {
      return
    }

    const deltaX = event.clientX - startX

    if (Math.abs(deltaX) < 400) {
      return
    }

    moveFigure(deltaX < 0 ? 1 : -1)
    figureDragStartXRef.current = event.clientX
  }

  function stopFigureDrag() {
    figureDragStartXRef.current = null
  }

  function startProgressDrag(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    isProgressDraggingRef.current = true
    updateProgressFromClientX(event.clientX)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      setCursor({ x: event.clientX, y: event.clientY })

      if (isProgressDraggingRef.current) {
        updateProgressFromClientX(event.clientX)
      }
    }

    function stopProgressDrag() {
      isProgressDraggingRef.current = false
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopProgressDrag)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopProgressDrag)
    }
  })

  useEffect(() => {
    setTypedCharacters(0)

    if (activeCaptionLength === 0) {
      return
    }

    let timer = 0

    function typeNextCharacter() {
      setTypedCharacters((current) => {
        if (current >= activeCaptionLength) {
          return current
        }

        timer = window.setTimeout(
          typeNextCharacter,
          nextTypingDelay(activeCaption, current + 1)
        )

        return current + 1
      })
    }

    timer = window.setTimeout(typeNextCharacter, nextTypingDelay(activeCaption, 0))

    return () => {
      window.clearTimeout(timer)
    }
  }, [view, activeCaptionLength])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === 'Space' && selectedTrack) {
        event.preventDefault()
        togglePlayback()
      }

      if (event.code === 'ArrowDown') {
        event.preventDefault()
        playAdjacentTrack(1)
      }

      if (event.code === 'ArrowUp') {
        event.preventDefault()
        playAdjacentTrack(-1)
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault()
        skipPlayback(5)
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault()
        skipPlayback(-5)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  })

  return (
    <main
      className={styles.viewport}
      onMouseMove={(event) => {
        setCursor({ x: event.clientX, y: event.clientY })
      }}
      onMouseLeave={() => {
        setCursor({ x: -40, y: -40 })
      }}
    >
      <div
        className={styles.customCursor}
        style={{ transform: `translate(${cursor.x - 10}px, ${cursor.y - 10}px)` }}
      />
      <section className={styles.stage} aria-label="MIBALHWA HAUS : MOOEEMEE">
        <nav className={styles.nav} aria-label="Primary">
          {categories.map((category) => {
            const isActive = view === category.view

            return (
              <button
                className={`${styles.navItem} ${isActive ? styles.activeNav : ''}`}
                key={category.view}
                type="button"
                onClick={() => selectView(category.view)}
              >
                {isActive ? `<${category.label}>` : category.label}
              </button>
            )
          })}
          {view === 'music' && selectedTrack && (
            <div className={styles.player} aria-label="Now playing">
              <button
                className={styles.playToggle}
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlayback}
              >
                {isPlaying ? (
                  <span className={styles.pauseIcon} aria-hidden="true">
                    <span />
                    <span />
                  </span>
                ) : (
                  <span className={styles.playIcon} aria-hidden="true" />
                )}
              </button>
              <button
                ref={progressTrackRef}
                className={styles.progressTrack}
                type="button"
                aria-label="Playback position"
                onPointerDown={startProgressDrag}
              >
                <span
                  className={styles.progressFill}
                  style={{
                    width: `${progressKnobSize / 2 + (progress / 100) * progressTravel}px`,
                  }}
                />
                <span
                  className={styles.progressKnob}
                  style={{
                    left: `${progressHitSlop + progressKnobSize / 2 + (progress / 100) * progressTravel}px`,
                  }}
                />
              </button>
            </div>
          )}
        </nav>

        <div className={styles.trackList} aria-label="Track list">
          {tracks.map((track) => {
            const isSelected = view === 'music' && selectedTrack === track.index

            return (
              <button
                className={`${styles.trackRow} ${isSelected ? styles.selectedTrack : ''} ${
                  view === 'music' && !isSelected ? styles.musicInactiveTrack : ''
                }`}
                key={track.index}
                type="button"
                disabled={view !== 'music'}
                onClick={() => selectTrack(track.index)}
              >
                <span className={styles.trackIndex}>{track.index}</span>
                <span className={styles.trackMeta}>
                  <span>{track.title}</span>
                  <span>{track.duration}</span>
                </span>
              </button>
            )
          })}
        </div>

        <audio
          ref={audioRef}
          onEnded={playNextTrack}
          onLoadedMetadata={(event) => {
            const pendingSeek = pendingSeekRef.current
            const audio = event.currentTarget

            if (pendingSeek !== null && audio.duration && Number.isFinite(audio.duration)) {
              audio.currentTime = audio.duration * (pendingSeek / 100)
              pendingSeekRef.current = null
            }
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget

            if (audio.duration) {
              setProgress((audio.currentTime / audio.duration) * 100)
            }
          }}
          preload="none"
        />

        <div
          className={styles.mainFigureFrame}
          onPointerDown={startFigureDrag}
          onPointerMove={dragFigure}
          onPointerUp={stopFigureDrag}
          onPointerCancel={stopFigureDrag}
          onWheel={scrollFigure}
        >
          <div className={styles.mainFigureTrack}>
            {figureSlides.map((src, index) => (
              <img
                className={`${styles.mainFigure} ${
                  index === figureIndex
                    ? `${styles.activeFigure} ${
                        figureDirection === 1 ? styles.fromRight : styles.fromLeft
                      }`
                    : index === previousFigureIndex
                      ? `${styles.previousFigure} ${
                          figureDirection === 1 ? styles.toLeft : styles.toRight
                        }`
                      : ''
                }`}
                src={src}
                alt=""
                draggable={false}
                key={`${src}-${index}`}
              />
            ))}
          </div>
        </div>

        {view === 'home' && (
          <div className={styles.caption}>
            <div className={styles.captionSizer} aria-hidden="true">
              {homeCaption.map((line) => (
                <p key={line}>
                  <span className={styles.captionBox}>{line}</span>
                </p>
              ))}
            </div>
            <div className={styles.captionTyped}>
              {(() => {
                let remainingCharacters = typedCharacters

                return homeCaption.map((line) => {
                  const visibleCharacters = remainingCharacters
                  const typedBlock = renderTypingBlock(
                    line,
                    visibleCharacters,
                    `${styles.captionBox} ${styles.captionReveal}`
                  )
                  remainingCharacters -= typingTextLength(line)

                  return (
                    <p key={line}>
                      {renderStaticBlock(
                        line,
                        `${styles.captionBox} ${styles.captionPlaceholder}`
                      )}
                      {typedBlock}
                    </p>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {view === 'about' && (
          <div className={`${styles.caption} ${styles.aboutCaption}`}>
            <div className={`${styles.captionSizer} ${styles.aboutCaption}`} aria-hidden="true">
              {aboutCaptionGroups.map((group) => (
                <div className={styles.captionGroup} key={group.join('')}>
                  {group.map((block) => (
                    <p key={block}>
                      <span className={styles.captionBox}>
                        {block.split('\n').map((line, index, lines) => (
                          <span key={`${block}-${index}`}>
                            {line}
                            {index < lines.length - 1 && <br />}
                          </span>
                        ))}
                      </span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <div className={`${styles.captionTyped} ${styles.aboutCaption}`}>
              {(() => {
                let remainingCharacters = typedCharacters

                return aboutCaptionGroups.map((group) => (
                  <div className={styles.captionGroup} key={group.join('')}>
                    {group.map((block) => {
                      const visibleCharacters = remainingCharacters
                      const typedBlock = renderTypingBlock(
                        block,
                        visibleCharacters,
                        `${styles.captionBox} ${styles.captionReveal}`
                      )
                      remainingCharacters -= typingTextLength(block)

                      return (
                        <p key={block}>
                          {renderStaticBlock(
                            block,
                            `${styles.captionBox} ${styles.captionPlaceholder}`
                          )}
                          {typedBlock}
                        </p>
                      )
                    })}
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        <div className={styles.dots} aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span className={index === figureIndex ? styles.activeDot : ''} key={index} />
          ))}
          <i
            className={styles.dotIndicator}
            style={{ transform: `translateY(${figureIndex * 22}px)` }}
          />
        </div>

        <div className={styles.lowerLayer} aria-hidden="true">
          <div className={styles.sideObject}>
            <img
              src="/static/images/epeul/door-section.png"
              alt=""
              draggable={false}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
