# Text to Piano Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interface-only Text to Piano page that opens from the existing black square and turns submitted text into a deterministic, animated horizontal field of outlined circles.

**Architecture:** A pure TypeScript event generator converts text into normalized visual events. A client-side React component renders those events to a responsive Canvas on `/space`, while the standalone `epeul-space-preview.html` mirrors the same visual and input behavior for direct local viewing. No TTS, Python analysis, piano synthesis, audio playback, or audio dependencies are included.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, Canvas 2D, Node.js built-in test runner

## Global Constraints

- Keep the existing black square's size, color, placement, and navigation target unchanged.
- Use a white full-screen field with the selected centered horizontal composition.
- Show only the submitted sentence, bottom input, and generated outlined circles.
- Do not add audio, TTS, Python, playback controls, headers, cards, toolbars, or persistent navigation.
- Ignore empty or whitespace-only submissions without clearing the current result.
- The same sentence must always generate the same visual pattern.
- Respect `prefers-reduced-motion: reduce`.
- Preserve unrelated existing changes in `app/EpeulExperience.tsx`, `app/epeul.module.css`, and `epeul-preview.html`.

---

### Task 1: Deterministic Visual Event Generator

**Files:**
- Create: `app/space/visual-events.ts`
- Create: `app/space/visual-events.test.mjs`

**Interfaces:**
- Consumes: A submitted sentence as a JavaScript string.
- Produces: `createPlaceholderEvents(text: string): VisualEvent[]` and the `VisualEvent` type used by the Canvas renderer.

- [ ] **Step 1: Write the failing generator tests**

Create `app/space/visual-events.test.mjs`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { createPlaceholderEvents } from './visual-events.ts'

test('returns no events for empty input', () => {
  assert.deepEqual(createPlaceholderEvents('   '), [])
})

test('creates a stable pattern for the same sentence', () => {
  const first = createPlaceholderEvents('겨울 속에는 소리가 없어요')
  const second = createPlaceholderEvents('겨울 속에는 소리가 없어요')

  assert.deepEqual(first, second)
  assert.ok(first.length >= 18)
})

test('creates a different pattern for different sentences', () => {
  assert.notDeepEqual(createPlaceholderEvents('첫 번째 문장'), createPlaceholderEvents('두 번째 문장'))
})

test('keeps every event in renderer-safe bounds', () => {
  const events = createPlaceholderEvents('저렇게까지 조용한 세상은 참없을것이오')

  for (const event of events) {
    assert.ok(event.time >= 0 && event.time <= 1)
    assert.ok(event.frequency >= 0 && event.frequency <= 1)
    assert.ok(event.energy >= 0.12 && event.energy <= 1)
    assert.ok(event.duration >= 420 && event.duration <= 1100)
  }
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test app/space/visual-events.test.mjs
```

Expected: FAIL because `app/space/visual-events.ts` does not exist.

- [ ] **Step 3: Implement the minimal deterministic generator**

Create `app/space/visual-events.ts`:

```ts
export type VisualEvent = {
  time: number
  frequency: number
  energy: number
  duration: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function hashText(text: string) {
  let hash = 2166136261

  for (const character of text) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createRandom(seed: number) {
  let state = seed || 1

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createPlaceholderEvents(text: string): VisualEvent[] {
  const normalized = text.trim()

  if (!normalized) return []

  const random = createRandom(hashText(normalized))
  const eventCount = clamp(Math.round(normalized.length * 1.7), 18, 64)

  return Array.from({ length: eventCount }, (_, index) => {
    const progress = eventCount === 1 ? 0.5 : index / (eventCount - 1)
    const wave = Math.sin(progress * Math.PI * 4 + random() * 0.8)

    return {
      time: clamp(progress + (random() - 0.5) * 0.018, 0, 1),
      frequency: clamp(0.5 + wave * 0.2 + (random() - 0.5) * 0.34, 0, 1),
      energy: clamp(0.12 + random() * 0.88, 0.12, 1),
      duration: Math.round(420 + random() * 680),
    }
  })
}
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
node --experimental-strip-types --test app/space/visual-events.test.mjs
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit the generator**

```bash
git add app/space/visual-events.ts app/space/visual-events.test.mjs
git commit -m "feat: add deterministic Text to Piano visual events"
```

---

### Task 2: Build the Next.js Text to Piano Interface

**Files:**
- Create: `app/space/TextToPianoExperience.tsx`
- Create: `app/space/text-to-piano.module.css`
- Create: `app/space/interface-source.test.mjs`
- Modify: `app/space/page.tsx`

**Interfaces:**
- Consumes: `createPlaceholderEvents(text)` and `VisualEvent` from Task 1.
- Produces: The `/space` route with initial, generating, complete, and replacing interface states.

- [ ] **Step 1: Add a failing route-source assertion**

Create `app/space/interface-source.test.mjs`:

```ts
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('space route mounts the interactive experience', async () => {
  const source = await readFile(new URL('./page.tsx', import.meta.url), 'utf8')

  assert.match(source, /TextToPianoExperience/)
  assert.match(source, /title:\s*['"]Text to Piano['"]/)
})

test('interface includes an accessible sentence form and canvas', async () => {
  const source = await readFile(new URL('./TextToPianoExperience.tsx', import.meta.url), 'utf8')

  assert.match(source, /aria-label="Text to Piano sentence"/)
  assert.match(source, /<canvas/)
  assert.match(source, /aria-live="polite"/)
})
```

- [ ] **Step 2: Run the source tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test app/space/interface-source.test.mjs
```

Expected: FAIL because `TextToPianoExperience.tsx` does not exist and `page.tsx` still renders an empty main element.

- [ ] **Step 3: Create the client interface**

Create `app/space/TextToPianoExperience.tsx`:

```tsx
'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'

import { createPlaceholderEvents, type VisualEvent } from './visual-events'
import styles from './text-to-piano.module.css'

const sequenceDuration = 1500

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

export default function TextToPianoExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const replacementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [draft, setDraft] = useState('')
  const [sentence, setSentence] = useState('')
  const [events, setEvents] = useState<VisualEvent[]>([])
  const [isReplacing, setIsReplacing] = useState(false)
  const [sequence, setSequence] = useState(0)

  useEffect(
    () => () => {
      if (replacementTimerRef.current) clearTimeout(replacementTimerRef.current)
    },
    []
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    let animationFrame = 0
    let startTime = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function draw(timestamp: number) {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(bounds.width))
      const height = Math.max(1, Math.round(bounds.height))

      if (canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio) {
        canvas.width = width * pixelRatio
        canvas.height = height * pixelRatio
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)

      if (!startTime) startTime = timestamp
      const elapsed = reducedMotion ? sequenceDuration + 1200 : timestamp - startTime

      events.forEach((event) => {
        const delay = event.time * sequenceDuration
        const progress = Math.min(1, Math.max(0, (elapsed - delay) / event.duration))
        if (progress <= 0) return

        const eased = easeOutCubic(progress)
        const radius = (5 + event.energy * 34) * (0.76 + eased * 0.24)
        const x = -radius + event.time * (width + radius * 2)
        const y = height / 2 + (event.frequency - 0.5) * Math.min(88, height * 0.46)

        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.globalAlpha = (0.18 + event.energy * 0.62) * eased
        context.lineWidth = 0.7 + event.energy * 1.15
        context.strokeStyle = '#171717'
        context.stroke()
      })

      context.globalAlpha = 1

      const finalEventEnd = sequenceDuration + Math.max(0, ...events.map((event) => event.duration))
      if (elapsed < finalEventEnd) animationFrame = requestAnimationFrame(draw)
    }

    animationFrame = requestAnimationFrame(draw)
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrame)
      startTime = 0
      animationFrame = requestAnimationFrame(draw)
    })
    resizeObserver.observe(canvas)

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
    }
  }, [events, sequence])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextSentence = draft.trim()
    if (!nextSentence) return

    const applySentence = () => {
      setSentence(nextSentence)
      setEvents(createPlaceholderEvents(nextSentence))
      setSequence((value) => value + 1)
      setDraft('')
      setIsReplacing(false)
      replacementTimerRef.current = null
    }

    if (events.length) {
      setIsReplacing(true)
      replacementTimerRef.current = setTimeout(applySentence, 180)
    } else {
      applySentence()
    }
  }

  return (
    <main className={styles.page}>
      <canvas
        className={`${styles.canvas} ${isReplacing ? styles.canvasReplacing : ''}`}
        ref={canvasRef}
        aria-hidden="true"
      />

      <div className={styles.composer}>
        <p className={styles.sentence}>{sentence}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.srOnly} htmlFor="text-to-piano-input">
            Text to Piano sentence
          </label>
          <input
            aria-label="Text to Piano sentence"
            autoComplete="off"
            className={styles.input}
            id="text-to-piano-input"
            onChange={(event) => setDraft(event.target.value)}
            spellCheck="false"
            type="text"
            value={draft}
          />
        </form>
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {sentence ? `${sentence}: ${events.length} visual events generated` : ''}
      </p>
    </main>
  )
}
```

- [ ] **Step 4: Add the centered responsive styling**

Create `app/space/text-to-piano.module.css`:

```css
@font-face {
  font-family: "D2Coding";
  src: url("/static/fonts/epeul/D2CodingBold.ttf") format("truetype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

.page {
  position: relative;
  width: 100vw;
  min-height: 100svh;
  overflow: hidden;
  background: #ffffff;
  color: #171717;
  font-family: "D2Coding", "Apple SD Gothic Neo", monospace;
}

.canvas {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: min(240px, 32svh);
  opacity: 1;
  transform: translateY(-50%);
  transition: opacity 180ms ease;
}

.canvasReplacing {
  opacity: 0;
}

.composer {
  position: absolute;
  right: 0;
  bottom: 28px;
  left: 0;
  display: grid;
  justify-items: center;
  gap: 22px;
  padding: 0 24px;
}

.sentence {
  min-height: 17px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.4;
  text-align: center;
}

.form {
  width: min(760px, 82vw);
}

.input {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 999px;
  outline: none;
  background: #ffffff;
  box-shadow: 0 4px 28px rgba(0, 0, 0, 0.07);
  color: #171717;
  font: inherit;
  padding: 0 24px;
  text-align: center;
}

.input:focus-visible {
  box-shadow: 0 4px 28px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(0, 0, 0, 0.18);
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .canvas {
    height: min(210px, 28svh);
  }

  .composer {
    bottom: 20px;
    gap: 18px;
    padding: 0 18px;
  }

  .form {
    width: 100%;
  }

  .input {
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .canvas {
    transition: none;
  }
}
```

- [ ] **Step 5: Mount the interface at `/space` with page metadata**

Replace `app/space/page.tsx` with:

```tsx
import type { Metadata } from 'next'

import TextToPianoExperience from './TextToPianoExperience'

export const metadata: Metadata = {
  title: 'Text to Piano',
  description: 'Text rendered as a field of visual circle events.',
}

export default function SpacePage() {
  return <TextToPianoExperience />
}
```

- [ ] **Step 6: Run the focused tests and type checker**

Run:

```bash
node --experimental-strip-types --test app/space/visual-events.test.mjs app/space/interface-source.test.mjs
npx tsc --noEmit
```

Expected: 6 tests pass and TypeScript exits with code 0.

- [ ] **Step 7: Commit the Next.js interface**

```bash
git add app/space/TextToPianoExperience.tsx app/space/text-to-piano.module.css app/space/page.tsx app/space/interface-source.test.mjs
git commit -m "feat: build Text to Piano interface"
```

---

### Task 3: Match the Standalone Preview and Entry Labels

**Files:**
- Create: `app/space/standalone-source.test.mjs`
- Modify: `epeul-space-preview.html`
- Modify: `epeul-preview.html`
- Modify: `app/EpeulExperience.tsx`

**Interfaces:**
- Consumes: The same text-to-event mapping and visual states defined in Tasks 1 and 2.
- Produces: A direct-file preview with matching behavior and accurate accessible names on both black square entry buttons.

- [ ] **Step 1: Add a failing standalone source test**

Create `app/space/standalone-source.test.mjs`:

```ts
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const projectRoot = new URL('../../', import.meta.url)

test('standalone preview contains the interface controls and canvas', async () => {
  const source = await readFile(new URL('epeul-space-preview.html', projectRoot), 'utf8')

  assert.match(source, /<canvas id="spectrum-canvas"/)
  assert.match(source, /id="sentence-input"/)
  assert.match(source, /function createPlaceholderEvents/)
  assert.doesNotMatch(source, /<audio|Tone\.|speechSynthesis|TTS/i)
})

test('both entry buttons identify the destination', async () => {
  const [reactSource, previewSource] = await Promise.all([
    readFile(new URL('app/EpeulExperience.tsx', projectRoot), 'utf8'),
    readFile(new URL('epeul-preview.html', projectRoot), 'utf8'),
  ])

  assert.match(reactSource, /aria-label="Open Text to Piano"/)
  assert.match(previewSource, /aria-label="Open Text to Piano"/)
})
```

- [ ] **Step 2: Run the standalone tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test app/space/standalone-source.test.mjs
```

Expected: FAIL because the standalone destination is still blank and the entry labels still say `Enter new space`.

- [ ] **Step 3: Replace the blank standalone preview with the approved interface**

Replace `epeul-space-preview.html` with this complete document:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Text to Piano</title>
    <style>
      @font-face {
        font-family: "D2Coding";
        src: url("public/static/fonts/epeul/D2CodingBold.ttf") format("truetype");
        font-style: normal;
        font-weight: 700;
        font-display: swap;
      }

      * { box-sizing: border-box; }
      html, body { width: 100%; min-height: 100%; margin: 0; }
      body { overflow: hidden; background: #fff; color: #171717; }

      .page {
        position: relative;
        width: 100vw;
        min-height: 100svh;
        overflow: hidden;
        background: #fff;
        font-family: "D2Coding", "Apple SD Gothic Neo", monospace;
      }

      #spectrum-canvas {
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        height: min(240px, 32svh);
        opacity: 1;
        transform: translateY(-50%);
        transition: opacity 180ms ease;
      }

      #spectrum-canvas.replacing { opacity: 0; }

      .composer {
        position: absolute;
        right: 0;
        bottom: 28px;
        left: 0;
        display: grid;
        justify-items: center;
        gap: 22px;
        padding: 0 24px;
      }

      #sentence {
        min-height: 17px;
        margin: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0;
        line-height: 1.4;
        text-align: center;
      }

      #sentence-form { width: min(760px, 82vw); }

      #sentence-input {
        width: 100%;
        height: 48px;
        border: 0;
        border-radius: 999px;
        outline: none;
        background: #fff;
        box-shadow: 0 4px 28px rgba(0, 0, 0, 0.07);
        color: #171717;
        font: inherit;
        padding: 0 24px;
        text-align: center;
      }

      #sentence-input:focus-visible {
        box-shadow: 0 4px 28px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(0, 0, 0, 0.18);
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
      }

      @media (max-width: 640px) {
        #spectrum-canvas { height: min(210px, 28svh); }
        .composer { bottom: 20px; gap: 18px; padding: 0 18px; }
        #sentence-form { width: 100%; }
        #sentence-input { height: 44px; }
      }

      @media (prefers-reduced-motion: reduce) {
        #spectrum-canvas { transition: none; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <canvas id="spectrum-canvas" aria-hidden="true"></canvas>
      <div class="composer">
        <p id="sentence" aria-hidden="true"></p>
        <form id="sentence-form">
          <label class="sr-only" for="sentence-input">Text to Piano sentence</label>
          <input
            id="sentence-input"
            aria-label="Text to Piano sentence"
            autocomplete="off"
            spellcheck="false"
          />
        </form>
      </div>
      <p class="sr-only" id="status" aria-live="polite"></p>
    </main>

    <script>
      const canvas = document.querySelector('#spectrum-canvas')
      const context = canvas.getContext('2d')
      const form = document.querySelector('#sentence-form')
      const input = document.querySelector('#sentence-input')
      const sentence = document.querySelector('#sentence')
      const status = document.querySelector('#status')
      const sequenceDuration = 1500
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      let visualEvents = []
      let animationFrame = 0
      let startTime = 0
      let replacementTimer = 0

      function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value))
      }

      function hashText(text) {
        let hash = 2166136261
        for (const character of text) {
          hash ^= character.codePointAt(0) || 0
          hash = Math.imul(hash, 16777619)
        }
        return hash >>> 0
      }

      function createRandom(seed) {
        let state = seed || 1
        return () => {
          state += 0x6d2b79f5
          let value = state
          value = Math.imul(value ^ (value >>> 15), value | 1)
          value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
          return ((value ^ (value >>> 14)) >>> 0) / 4294967296
        }
      }

      function createPlaceholderEvents(text) {
        const normalized = text.trim()
        if (!normalized) return []

        const random = createRandom(hashText(normalized))
        const eventCount = clamp(Math.round(normalized.length * 1.7), 18, 64)

        return Array.from({ length: eventCount }, (_, index) => {
          const progress = eventCount === 1 ? 0.5 : index / (eventCount - 1)
          const wave = Math.sin(progress * Math.PI * 4 + random() * 0.8)
          return {
            time: clamp(progress + (random() - 0.5) * 0.018, 0, 1),
            frequency: clamp(0.5 + wave * 0.2 + (random() - 0.5) * 0.34, 0, 1),
            energy: clamp(0.12 + random() * 0.88, 0.12, 1),
            duration: Math.round(420 + random() * 680),
          }
        })
      }

      function easeOutCubic(value) {
        return 1 - Math.pow(1 - value, 3)
      }

      function draw(timestamp) {
        const bounds = canvas.getBoundingClientRect()
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        const width = Math.max(1, Math.round(bounds.width))
        const height = Math.max(1, Math.round(bounds.height))

        if (canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio) {
          canvas.width = width * pixelRatio
          canvas.height = height * pixelRatio
        }

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        context.clearRect(0, 0, width, height)
        if (!startTime) startTime = timestamp
        const elapsed = reducedMotion ? sequenceDuration + 1200 : timestamp - startTime

        visualEvents.forEach((event) => {
          const delay = event.time * sequenceDuration
          const progress = Math.min(1, Math.max(0, (elapsed - delay) / event.duration))
          if (progress <= 0) return

          const eased = easeOutCubic(progress)
          const radius = (5 + event.energy * 34) * (0.76 + eased * 0.24)
          const x = -radius + event.time * (width + radius * 2)
          const y = height / 2 + (event.frequency - 0.5) * Math.min(88, height * 0.46)

          context.beginPath()
          context.arc(x, y, radius, 0, Math.PI * 2)
          context.globalAlpha = (0.18 + event.energy * 0.62) * eased
          context.lineWidth = 0.7 + event.energy * 1.15
          context.strokeStyle = '#171717'
          context.stroke()
        })

        context.globalAlpha = 1
        const finalEnd = sequenceDuration + Math.max(0, ...visualEvents.map((event) => event.duration))
        if (elapsed < finalEnd) animationFrame = requestAnimationFrame(draw)
      }

      function startAnimation() {
        cancelAnimationFrame(animationFrame)
        startTime = 0
        animationFrame = requestAnimationFrame(draw)
      }

      function applySentence(nextSentence) {
        visualEvents = createPlaceholderEvents(nextSentence)
        sentence.textContent = nextSentence
        status.textContent = `${nextSentence}: ${visualEvents.length} visual events generated`
        input.value = ''
        canvas.classList.remove('replacing')
        replacementTimer = 0
        startAnimation()
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault()
        const nextSentence = input.value.trim()
        if (!nextSentence) return

        clearTimeout(replacementTimer)
        if (visualEvents.length) {
          canvas.classList.add('replacing')
          replacementTimer = window.setTimeout(() => applySentence(nextSentence), 180)
        } else {
          applySentence(nextSentence)
        }
      })

      new ResizeObserver(() => {
        if (visualEvents.length) startAnimation()
      }).observe(canvas)
    </script>
  </body>
</html>
```

- [ ] **Step 4: Update accessible names without changing the buttons visually**

In `app/EpeulExperience.tsx`, change only:

```tsx
aria-label="Enter new space"
```

to:

```tsx
aria-label="Open Text to Piano"
```

In `epeul-preview.html`, change only:

```html
aria-label="Enter new space"
```

to:

```html
aria-label="Open Text to Piano"
```

Keep the existing `/space` and `epeul-space-preview.html` navigation handlers unchanged.

- [ ] **Step 5: Run all interface source tests**

Run:

```bash
node --experimental-strip-types --test app/space/visual-events.test.mjs app/space/interface-source.test.mjs app/space/standalone-source.test.mjs
```

Expected: 8 tests pass.

- [ ] **Step 6: Commit standalone parity and labels**

```bash
git add epeul-space-preview.html epeul-preview.html app/EpeulExperience.tsx app/space/standalone-source.test.mjs
git commit -m "feat: connect EPEUL entry to Text to Piano interface"
```

---

### Task 4: Build and Visual Verification

**Files:**
- Modify only if verification exposes a scoped layout or interaction defect: `app/space/TextToPianoExperience.tsx`, `app/space/text-to-piano.module.css`, `epeul-space-preview.html`

**Interfaces:**
- Consumes: Completed `/space` and standalone preview implementations.
- Produces: Verified desktop, mobile, keyboard, repeated-submission, and reduced-motion behavior.

- [ ] **Step 1: Run the full focused test set**

Run:

```bash
node --experimental-strip-types --test app/space/*.test.mjs
```

Expected: 8 tests pass.

- [ ] **Step 2: Run formatting, type checking, and production build**

Run:

```bash
npx prettier --check app/space epeul-space-preview.html
npx tsc --noEmit
yarn build
```

Expected: all commands exit with code 0 and Next.js reports a generated `/space` route.

- [ ] **Step 3: Start the local development server**

Run:

```bash
yarn dev
```

Expected: server listens at `http://127.0.0.1:3004`.

- [ ] **Step 4: Verify navigation and initial state at desktop size**

Open `http://127.0.0.1:3004`, set the viewport to 1440 × 900, click the existing black square, and verify:

- URL becomes `http://127.0.0.1:3004/space`.
- The page is white and initially shows no circles or submitted sentence.
- The centered Canvas and bottom input do not overlap.
- No audio or playback controls are present.

- [ ] **Step 5: Verify generation and replacement behavior**

Submit `겨울 속에는 소리가 없어요`, record the final circle arrangement, then submit the same sentence again and verify the arrangement is identical. Submit `저렇게까지 조용한 세상은 참없을것이오` and verify the old arrangement is replaced cleanly. Submit whitespace and verify the current result remains unchanged.

- [ ] **Step 6: Verify mobile and reduced-motion layouts**

At 390 × 844, verify the sentence remains centered above the input, the input stays fully visible, and the circle field remains centered without horizontal page scrolling. Emulate `prefers-reduced-motion: reduce` and verify the circles appear directly without traveling or elastic motion.

- [ ] **Step 7: Verify the standalone preview**

Open `epeul-preview.html` directly, click the black square, and verify `epeul-space-preview.html` opens with the same initial, submission, replacement, mobile, and reduced-motion behavior.

- [ ] **Step 8: Commit any verification-only fixes**

If verification required changes:

```bash
git add app/space/TextToPianoExperience.tsx app/space/text-to-piano.module.css epeul-space-preview.html
git commit -m "fix: polish Text to Piano responsive interface"
```

If verification required no changes, do not create an empty commit.
