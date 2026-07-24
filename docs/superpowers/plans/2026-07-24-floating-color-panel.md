# Floating Color Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split-column page with a full-screen pixel video, an overlaid left color panel, and an overlaid lower control bar while preserving Kick response and 1920×1080 H.264 export.

**Architecture:** `PixelExperience` owns four palette values and passes them to a focused `ColorPanel` editor and the existing `PixelCanvas` renderer. The WebGL shader receives each palette role as an independent uniform. CSS changes the page from document flow columns to one full-viewport stage with fixed overlay controls.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL 1, CSS, Node test runner

## Global Constraints

- The pixel video fills the browser viewport and is never resized by the control panels.
- The desktop color panel is opaque white and floats over the left side of the video.
- The editable roles are background, diagonal, circle, and solid square.
- Default colors are background `#EDECF1`, diagonal `#9AC2F0`, circle `#B70000`, and solid square `#9AC2F0`.
- Pixel size, timeline, Kick monitoring, playback, and export remain in a separate floating lower bar.
- Kick energy changes tile size only and never changes palette colors.
- Mobile uses a compact horizontal palette at the top.
- H.264 export remains 1920×1080 and excludes all interface overlays.
- Do not add runtime dependencies.

---

### Task 1: Palette Model and Color Editor

**Files:**
- Create: `lib/pixel-palette.mjs`
- Create: `components/pixel-experience/ColorPanel.tsx`
- Create: `tests/pixel-palette-controls.test.mjs`

**Interfaces:**
- Produces: `DEFAULT_PIXEL_PALETTE` with `background`, `diagonal`, `circle`, and `solid` string properties.
- Produces: `normalizeHexColor(value: unknown, fallback: string): string`.
- Produces: `hexToUnitRgb(value: unknown, fallback: string): Float32Array`.
- Produces: `ColorPanel({ palette, onChange })`, where `onChange(key, value)` reports a selected hexadecimal color.

- [ ] **Step 1: Write the failing palette model and component tests**

Create `tests/pixel-palette-controls.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_PIXEL_PALETTE,
  hexToUnitRgb,
  normalizeHexColor,
} from '../lib/pixel-palette.mjs'

const panelSource = readFileSync(
  new URL('../components/pixel-experience/ColorPanel.tsx', import.meta.url),
  'utf8'
)

test('defines four independent default palette roles', () => {
  assert.deepEqual(DEFAULT_PIXEL_PALETTE, {
    background: '#EDECF1',
    diagonal: '#9AC2F0',
    circle: '#B70000',
    solid: '#9AC2F0',
  })
})

test('normalizes valid colors and rejects invalid values', () => {
  assert.equal(normalizeHexColor('#abcdef', '#000000'), '#ABCDEF')
  assert.equal(normalizeHexColor('nope', '#123456'), '#123456')
  assert.equal(normalizeHexColor(null, '#123456'), '#123456')
})

test('converts a hex color into WebGL unit RGB values', () => {
  const [red, green, blue] = hexToUnitRgb('#FF8000', '#000000')
  assert.equal(red, 1)
  assert.ok(Math.abs(green - (128 / 255)) < 0.000001)
  assert.equal(blue, 0)
})

test('renders four labelled browser color inputs', () => {
  assert.match(panelSource, /type="color"/)
  assert.match(panelSource, /배경/)
  assert.match(panelSource, /사선/)
  assert.match(panelSource, /동그라미/)
  assert.match(panelSource, /네모/)
  assert.match(panelSource, /palette-grid/)
})
```

- [ ] **Step 2: Run the focused test and verify the missing module failure**

Run:

```bash
node --test tests/pixel-palette-controls.test.mjs
```

Expected: FAIL because `lib/pixel-palette.mjs` and `ColorPanel.tsx` do not exist.

- [ ] **Step 3: Implement the palette helpers**

Create `lib/pixel-palette.mjs`:

```js
export const DEFAULT_PIXEL_PALETTE = Object.freeze({
  background: '#EDECF1',
  diagonal: '#9AC2F0',
  circle: '#B70000',
  solid: '#9AC2F0',
})

const HEX_COLOR = /^#[0-9A-F]{6}$/

export function normalizeHexColor(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return HEX_COLOR.test(normalized) ? normalized : fallback
}

export function hexToUnitRgb(value, fallback) {
  const normalized = normalizeHexColor(value, fallback)
  return new Float32Array([
    Number.parseInt(normalized.slice(1, 3), 16) / 255,
    Number.parseInt(normalized.slice(3, 5), 16) / 255,
    Number.parseInt(normalized.slice(5, 7), 16) / 255,
  ])
}
```

- [ ] **Step 4: Implement the focused color panel**

Create `components/pixel-experience/ColorPanel.tsx`:

```tsx
'use client'

import type { CSSProperties } from 'react'
import { DEFAULT_PIXEL_PALETTE } from '../../lib/pixel-palette.mjs'

type PixelPalette = typeof DEFAULT_PIXEL_PALETTE
type PaletteKey = keyof PixelPalette

type ColorPanelProps = {
  palette: PixelPalette
  onChange: (key: PaletteKey, value: string) => void
}

const COLOR_FIELDS: Array<{ key: PaletteKey; label: string }> = [
  { key: 'background', label: '배경' },
  { key: 'diagonal', label: '사선' },
  { key: 'circle', label: '동그라미' },
  { key: 'solid', label: '네모' },
]

export function ColorPanel({ palette, onChange }: ColorPanelProps) {
  return (
    <aside className="color-panel" aria-label="색상 변경">
      <p className="panel-label">COLOURS &amp; PATTERNS</p>
      <div className="palette-grid">
        {COLOR_FIELDS.map(({ key, label }) => (
          <label className="palette-control" key={key}>
            <span
              className={`palette-preview palette-preview--${key}`}
              style={{ '--swatch-color': palette[key] } as CSSProperties}
            >
              <input
                type="color"
                value={palette[key]}
                aria-label={`${label} 색상`}
                onChange={(event) => onChange(key, event.currentTarget.value)}
              />
            </span>
            <span className="palette-name">{label}</span>
            <output>{palette[key]}</output>
          </label>
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Run the focused test**

Run:

```bash
node --test tests/pixel-palette-controls.test.mjs
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit the palette model and editor**

```bash
git add lib/pixel-palette.mjs components/pixel-experience/ColorPanel.tsx tests/pixel-palette-controls.test.mjs
git commit -m "feat: add editable pixel palette"
```

---

### Task 2: WebGL Palette Uniforms

**Files:**
- Modify: `lib/pixel-shaders.ts`
- Modify: `components/pixel-experience/PixelCanvas.tsx`
- Modify: `tests/pixel-palette.test.mjs`

**Interfaces:**
- Consumes: `DEFAULT_PIXEL_PALETTE` and `hexToUnitRgb` from Task 1.
- Consumes: `palette` with the four string properties from Task 1.
- Produces: shader uniforms `uBackgroundColor`, `uDiagonalColor`, `uCircleColor`, and `uSolidColor`.

- [ ] **Step 1: Replace the fixed-color assertions with failing uniform assertions**

Replace the first test in `tests/pixel-palette.test.mjs` with:

```js
test('shader maps four luminance bands to independent palette uniforms', () => {
  assert.match(shaderSource, /uniform vec3 uBackgroundColor/)
  assert.match(shaderSource, /uniform vec3 uDiagonalColor/)
  assert.match(shaderSource, /uniform vec3 uCircleColor/)
  assert.match(shaderSource, /uniform vec3 uSolidColor/)
  assert.match(shaderSource, /mix\(uBackgroundColor, uDiagonalColor, diagonal \* border\)/)
  assert.match(shaderSource, /mix\(uBackgroundColor, uCircleColor, ring \* border\)/)
  assert.match(shaderSource, /mix\(uBackgroundColor, uSolidColor, border\)/)
  assert.doesNotMatch(shaderSource, /vec3 backgroundColor =/)
})
```

Retain the second test with this exact content:

```js
test('kick does not tint the shader output color', () => {
  assert.doesNotMatch(shaderSource, /uniform float uKick/)
  assert.doesNotMatch(shaderSource, /outputColor\s*\+=/)
})
```

- [ ] **Step 2: Run the shader test and verify it fails**

Run:

```bash
node --test tests/pixel-palette.test.mjs
```

Expected: FAIL because the shader still declares fixed local colors.

- [ ] **Step 3: Convert the fragment shader to palette uniforms**

In `lib/pixel-shaders.ts`, add these declarations after `uColumns`:

```glsl
uniform vec3 uBackgroundColor;
uniform vec3 uDiagonalColor;
uniform vec3 uCircleColor;
uniform vec3 uSolidColor;
```

Remove the three fixed `vec3` declarations and replace the color mapping with:

```glsl
  vec3 outputColor = uBackgroundColor;
  if (luma >= 0.22 && luma < 0.46) {
    outputColor = mix(uBackgroundColor, uDiagonalColor, diagonal * border);
  }
  if (luma >= 0.46 && luma < 0.72) {
    outputColor = mix(uBackgroundColor, uCircleColor, ring * border);
  }
  if (luma >= 0.72) {
    outputColor = mix(uBackgroundColor, uSolidColor, border);
  }
```

- [ ] **Step 4: Pass and upload the four colors in `PixelCanvas`**

Add imports and the palette type in `PixelCanvas.tsx`:

```tsx
import { DEFAULT_PIXEL_PALETTE, hexToUnitRgb } from '../../lib/pixel-palette.mjs'

type PixelPalette = typeof DEFAULT_PIXEL_PALETTE
```

Add `palette: PixelPalette` to `PixelCanvasProps`, destructure it, and include it in `valuesRef` plus the prop-sync effect.

Before `gl.drawArrays`, upload all four uniforms:

```tsx
gl.uniform3fv(
  gl.getUniformLocation(program, 'uBackgroundColor'),
  hexToUnitRgb(current.palette.background, DEFAULT_PIXEL_PALETTE.background)
)
gl.uniform3fv(
  gl.getUniformLocation(program, 'uDiagonalColor'),
  hexToUnitRgb(current.palette.diagonal, DEFAULT_PIXEL_PALETTE.diagonal)
)
gl.uniform3fv(
  gl.getUniformLocation(program, 'uCircleColor'),
  hexToUnitRgb(current.palette.circle, DEFAULT_PIXEL_PALETTE.circle)
)
gl.uniform3fv(
  gl.getUniformLocation(program, 'uSolidColor'),
  hexToUnitRgb(current.palette.solid, DEFAULT_PIXEL_PALETTE.solid)
)
```

- [ ] **Step 5: Run the focused shader and palette tests**

Run:

```bash
node --test tests/pixel-palette.test.mjs tests/pixel-palette-controls.test.mjs
```

Expected: 6 tests pass.

- [ ] **Step 6: Commit WebGL palette support**

```bash
git add lib/pixel-shaders.ts components/pixel-experience/PixelCanvas.tsx tests/pixel-palette.test.mjs
git commit -m "feat: render adjustable pixel colors"
```

---

### Task 3: Full-Screen Overlay Layout and Integration

**Files:**
- Modify: `components/pixel-experience/PixelExperience.tsx`
- Modify: `app/globals.css`
- Delete: `tests/split-workspace-layout.test.mjs`
- Create: `tests/floating-overlay-layout.test.mjs`

**Interfaces:**
- Consumes: `ColorPanel`, `DEFAULT_PIXEL_PALETTE`, and `normalizeHexColor` from Task 1.
- Consumes: the new `palette` prop on `PixelCanvas` from Task 2.
- Produces: one `.experience-shell` containing a full-screen `.visual-stage`, floating `.color-panel`, and floating `.control-deck`.

- [ ] **Step 1: Write the failing overlay layout test**

Create `tests/floating-overlay-layout.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('renders palette and controls over one full-screen stage', () => {
  assert.match(experience, /<ColorPanel/)
  assert.match(experience, /palette=\{palette\}/)
  assert.match(experience, /<PixelCanvas[\s\S]*palette=\{palette\}/)
  assert.doesNotMatch(experience, /blank-sidebar|className="workspace"/)
})

test('uses overlay layers instead of separate layout columns', () => {
  assert.match(css, /\.experience-shell\s*\{[^}]*position:\s*relative[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s)
  assert.match(css, /\.visual-stage\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/s)
  assert.match(css, /\.color-panel\s*\{[^}]*position:\s*absolute[^}]*z-index:\s*3/s)
  assert.match(css, /\.control-deck\s*\{[^}]*position:\s*absolute[^}]*z-index:\s*2/s)
  assert.doesNotMatch(css, /grid-template-columns:\s*clamp\(240px/)
})

test('turns the palette into a compact top overlay on phones', () => {
  assert.match(
    css,
    /@media\s*\(max-width:\s*800px\)[\s\S]*?\.color-panel\s*\{[^}]*bottom:\s*auto[^}]*width:\s*auto/s
  )
  assert.match(
    css,
    /@media\s*\(max-width:\s*800px\)[\s\S]*?\.palette-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s
  )
})
```

Delete `tests/split-workspace-layout.test.mjs` because its required two-column behavior is intentionally replaced.

- [ ] **Step 2: Run the overlay test and verify it fails**

Run:

```bash
node --test tests/floating-overlay-layout.test.mjs
```

Expected: FAIL because `PixelExperience` still renders `blank-sidebar` and `workspace`.

- [ ] **Step 3: Integrate palette state in `PixelExperience`**

Replace `components/pixel-experience/PixelExperience.tsx` with:

```tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { effectiveTiles, manualTilesFromPosition } from '../../lib/pixel-controls.mjs'
import { DEFAULT_PIXEL_PALETTE, normalizeHexColor } from '../../lib/pixel-palette.mjs'
import { useH264Recorder } from '../../hooks/useH264Recorder'
import { usePlaybackEngine } from '../../hooks/usePlaybackEngine'
import { ColorPanel } from './ColorPanel'
import { DragControl } from './DragControl'
import { ExportButton } from './ExportButton'
import { PixelCanvas } from './PixelCanvas'

function formatTime(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const minutes = Math.floor(safeValue / 60)
  const seconds = Math.floor(safeValue % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function PixelExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [manualPosition, setManualPosition] = useState(0.54)
  const [palette, setPalette] = useState({ ...DEFAULT_PIXEL_PALETTE })
  const [webglError, setWebglError] = useState<string | null>(null)
  const playback = usePlaybackEngine()
  const recorder = useH264Recorder()
  const baseTiles = useMemo(() => manualTilesFromPosition(manualPosition), [manualPosition])
  const tiles = useMemo(() => effectiveTiles(baseTiles, playback.kick), [baseTiles, playback.kick])
  const hasStarted = playback.status === 'playing' || playback.status === 'ended'
  const isReady = playback.status === 'ready' || hasStarted

  const handleWebglError = useCallback((message: string) => setWebglError(message), [])
  const handlePaletteChange = useCallback(
    (key: keyof typeof DEFAULT_PIXEL_PALETTE, value: string) => {
      setPalette((current) => ({
        ...current,
        [key]: normalizeHexColor(value, DEFAULT_PIXEL_PALETTE[key]),
      }))
    },
    []
  )
  const handleExport = useCallback(async () => {
    const started = await recorder.startRecording(canvasRef.current, playback.recordingAudioStream)
    if (started) await playback.restart()
  }, [playback, recorder])

  useEffect(() => {
    if (playback.status === 'ended' && recorder.recording) recorder.stopRecording()
  }, [playback.status, recorder])

  const progress = playback.duration > 0 ? playback.currentTime / playback.duration : 0
  const activeError = webglError || playback.error || recorder.error

  return (
    <main className="experience-shell">
      <section className="visual-stage" aria-label="픽셀 CCTV 재생 영역">
        <PixelCanvas
          video={playback.videoRef.current}
          tiles={tiles}
          palette={palette}
          playing={true}
          recording={recorder.recording}
          canvasRef={canvasRef}
          onError={handleWebglError}
        />

        <video
          ref={playback.videoRef}
          className="source-media"
          src={assetPath('media/cctv-1080p.mp4')}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <audio
          ref={playback.audioRef}
          className="source-media"
          src={assetPath('media/if-and-only-if.mp3')}
          preload="auto"
        />
      </section>

      <ColorPanel palette={palette} onChange={handlePaletteChange} />

      <section className="control-deck" aria-label="픽셀 컨트롤">
        <div className="timeline-row">
          <span className="timecode">{formatTime(playback.currentTime)}</span>
          <div className="timeline" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} />
          </div>
          <span className="timecode">{formatTime(playback.duration)}</span>
        </div>

        <DragControl
          value={manualPosition}
          tiles={tiles}
          onChange={setManualPosition}
          disabled={!isReady && playback.status === 'loading'}
        />

        <div className="action-row">
          <div className="kick-monitor">
            <span>KICK INPUT</span>
            <i aria-hidden="true"><b style={{ transform: `scaleX(${playback.kick})` }} /></i>
          </div>
          <div className="button-group">
            <button
              className="action-button"
              type="button"
              onClick={() => void (hasStarted ? playback.restart() : playback.start())}
              disabled={playback.status === 'loading' || recorder.recording}
            >
              {playback.status === 'loading' ? '시작 중' : hasStarted ? '처음부터' : '음악 시작'}
            </button>
            <ExportButton
              supported={recorder.supported}
              recording={recorder.recording}
              disabled={!hasStarted || !playback.recordingAudioStream}
              onStart={() => void handleExport()}
              onStop={recorder.stopRecording}
            />
          </div>
        </div>

        {!recorder.supported && (
          <p className="support-note">
            H.264 MP4 저장은 지원 브라우저에서만 활성화됩니다. 화면 조작과 자동 Kick 반응은 그대로 사용할 수 있습니다.
          </p>
        )}
        {activeError && <p className="error-note" role="alert">{activeError}</p>}
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Replace split-column CSS with overlay CSS**

In `app/globals.css`, remove `.blank-sidebar` and `.workspace` rules. Replace the core shell, stage, control, and responsive layout with:

```css
.experience-shell {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: var(--paper);
}

.visual-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--paper);
}

.pixel-canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
  background: var(--paper);
}

.color-panel {
  position: absolute;
  z-index: 3;
  top: clamp(16px, 2vw, 28px);
  bottom: clamp(16px, 2vw, 28px);
  left: clamp(16px, 2vw, 28px);
  width: clamp(260px, 21vw, 330px);
  padding: clamp(18px, 2vw, 28px);
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--line);
  box-shadow: 0 18px 46px rgba(23, 22, 27, 0.14);
}

.panel-label {
  margin: 0 0 18px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 10px;
}

.palette-control {
  display: grid;
  gap: 6px;
  min-width: 0;
  cursor: pointer;
}

.palette-preview {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--swatch-color);
}

.palette-preview input {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.palette-preview--diagonal {
  background: repeating-linear-gradient(
    45deg,
    var(--swatch-color) 0 12px,
    #fff 12px 20px
  );
}

.palette-preview--circle::after {
  content: "";
  position: absolute;
  inset: 22%;
  border: 8px solid var(--swatch-color);
  border-radius: 50%;
}

.palette-name,
.palette-control output {
  overflow: hidden;
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
}

.palette-control output {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.control-deck {
  position: absolute;
  z-index: 2;
  right: clamp(16px, 2vw, 28px);
  bottom: clamp(16px, 2vw, 28px);
  left: clamp(304px, 25vw, 390px);
  width: auto;
  margin: 0;
  padding: 14px;
  display: grid;
  gap: 12px;
  background: rgba(237, 236, 241, 0.94);
  border: 1px solid var(--line);
  box-shadow: 0 18px 46px rgba(23, 22, 27, 0.14);
  backdrop-filter: blur(12px);
}
```

Replace the existing `@media (max-width: 800px)` layout rules with:

```css
@media (max-width: 800px) {
  .color-panel {
    top: max(12px, env(safe-area-inset-top));
    right: max(12px, env(safe-area-inset-right));
    bottom: auto;
    left: max(12px, env(safe-area-inset-left));
    width: auto;
    padding: 10px;
    overflow: visible;
  }

  .panel-label {
    margin-bottom: 8px;
    font-size: 9px;
  }

  .palette-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
  }

  .palette-control {
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: center;
    gap: 3px 6px;
  }

  .palette-preview {
    grid-row: 1 / 3;
  }

  .palette-name,
  .palette-control output {
    font-size: 8px;
  }

  .control-deck {
    right: max(12px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
    left: max(12px, env(safe-area-inset-left));
    gap: 8px;
    padding: 10px;
  }

  .action-row {
    align-items: flex-end;
  }

  .kick-monitor {
    width: 32%;
    display: grid;
    gap: 6px;
  }

  .button-group {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .action-button {
    min-height: 36px;
    padding: 0 10px;
  }
}
```

- [ ] **Step 5: Run layout and full tests**

Run:

```bash
node --test tests/floating-overlay-layout.test.mjs tests/pixel-palette-controls.test.mjs tests/pixel-palette.test.mjs
```

Expected: 9 tests pass.

Run:

```bash
npm test
```

Expected: all tests pass with zero failures.

- [ ] **Step 6: Commit the full-screen overlay integration**

```bash
git add components/pixel-experience/PixelExperience.tsx app/globals.css tests/floating-overlay-layout.test.mjs tests/split-workspace-layout.test.mjs
git commit -m "feat: float controls over pixel stage"
```

---

### Task 4: Production Verification and Deployment

**Files:**
- Verify: all source and test files changed in Tasks 1–3
- Generated locally: `out/`

**Interfaces:**
- Consumes: the completed full-screen layout and palette pipeline.
- Produces: a verified static export and the deployed GitHub Pages site.

- [ ] **Step 1: Run the production build**

Run:

```bash
npm run build
```

Expected: Next.js compiles successfully, generates all static pages, and exits with code 0.

- [ ] **Step 2: Verify the exported site**

Run:

```bash
npm run verify:static
```

Expected: `Static export verified`.

- [ ] **Step 3: Run final repository checks**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: no whitespace errors and a clean `codex/audience-pixel-cctv` branch.

- [ ] **Step 4: Refresh the local preview**

Check whether the preview server is already listening:

```bash
lsof -nP -iTCP:3004 -sTCP:LISTEN
```

If the command returns no listener, start the preview with:

```bash
python3 -m http.server 3004 --bind 127.0.0.1 --directory out
```

Then verify:

```bash
curl -fsSI http://127.0.0.1:3004/
curl -fsSI http://127.0.0.1:3004/media/cctv-1080p.mp4
curl -fsSI http://127.0.0.1:3004/media/if-and-only-if.mp3
```

Expected: all three requests return HTTP 200.

- [ ] **Step 5: Push and verify GitHub Pages**

Push `codex/audience-pixel-cctv` to the repository `main` branch:

```bash
GIT_TERMINAL_PROMPT=0 git -c credential.https://github.com.helper= -c credential.https://github.com.helper=osxkeychain push https://github.com/eeeepeul/eeeepeul.github.io.git codex/audience-pixel-cctv:main
```

Verify the Pages workflow completes successfully for the pushed commit:

```bash
curl -fsSL 'https://api.github.com/repos/eeeepeul/eeeepeul.github.io/actions/workflows/pages.yml/runs?per_page=5'
```

Then confirm the public routes:

```bash
curl -fsSI https://eeeepeul.github.io/
curl -fsSI https://eeeepeul.github.io/media/cctv-1080p.mp4
curl -fsSI https://eeeepeul.github.io/media/if-and-only-if.mp3
```

Expected: all three public requests return HTTP 200.
