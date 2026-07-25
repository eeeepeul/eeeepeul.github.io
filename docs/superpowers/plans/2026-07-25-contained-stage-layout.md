# Contained Stage Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the existing color controls in an approximately 25%-wide left panel and contain the pixel video plus lower controls in a separate right workspace.

**Architecture:** `PixelExperience` adds one `stage-workspace` wrapper around the existing video stage and control deck. CSS changes the viewport overlay layout into two independent desktop surfaces, with a 16:9 clipped stage above an in-flow control deck. The WebGL renderer, palette state, audio engine, Kick response, and H.264 recorder remain unchanged.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL 1, CSS, Node test runner

## Global Constraints

- The page background remains `#EDECF1`.
- The desktop color panel occupies approximately 25% of the viewport width.
- The pixel video is visible only inside a 16:9 right-hand rectangle.
- The source video is neither stretched nor cropped.
- The lower control deck matches the video stage width and sits directly below it.
- The four editable palette colors and automatic Kick response remain unchanged.
- Mobile stacks palette, stage, and controls vertically.
- H.264 export remains 1920×1080 and excludes all interface surfaces.
- Do not add runtime dependencies.

---

### Task 1: Contained Desktop and Mobile Workspace

**Files:**
- Modify: `components/pixel-experience/PixelExperience.tsx`
- Modify: `app/globals.css`
- Delete: `tests/floating-overlay-layout.test.mjs`
- Create: `tests/contained-stage-layout.test.mjs`

**Interfaces:**
- Consumes: existing `ColorPanel`, `PixelCanvas`, playback, Kick, drag, and export components unchanged.
- Produces: `.experience-shell > .color-panel + .stage-workspace`.
- Produces: `.stage-workspace > .visual-stage + .control-deck`.

- [ ] **Step 1: Write the failing contained-layout tests**

Create `tests/contained-stage-layout.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('groups the stage and lower controls in a separate right workspace', () => {
  assert.match(experience, /<ColorPanel palette=\{palette\} onChange=\{handlePaletteChange\} \/>/)
  assert.match(experience, /<div className="stage-workspace">/)
  assert.match(
    experience,
    /<div className="stage-workspace">[\s\S]*?<section className="visual-stage"[\s\S]*?<section className="control-deck"/
  )
})

test('uses a quarter-width panel and a contained 16 by 9 stage', () => {
  assert.match(
    css,
    /\.experience-shell\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*clamp\(300px,\s*25vw,\s*500px\)\s+minmax\(0,\s*1fr\)/s
  )
  assert.match(css, /\.color-panel\s*\{[^}]*position:\s*relative[^}]*width:\s*auto/s)
  assert.match(css, /\.stage-workspace\s*\{[^}]*min-width:\s*0[^}]*display:\s*grid/s)
  assert.match(
    css,
    /\.visual-stage\s*\{[^}]*position:\s*relative[^}]*aspect-ratio:\s*16\s*\/\s*9[^}]*overflow:\s*hidden/s
  )
  assert.doesNotMatch(css, /\.visual-stage\s*\{[^}]*inset:\s*0/s)
})

test('places the control deck below the stage instead of over it', () => {
  assert.match(css, /\.control-deck\s*\{[^}]*position:\s*relative[^}]*width:\s*100%/s)
  assert.doesNotMatch(css, /\.control-deck\s*\{[^}]*bottom:\s*clamp/s)
})

test('stacks palette, stage, and controls on narrow screens', () => {
  assert.match(
    css,
    /@media\s*\(max-width:\s*800px\)[\s\S]*?\.experience-shell\s*\{[^}]*grid-template-columns:\s*1fr[^}]*height:\s*auto/s
  )
  assert.match(
    css,
    /@media\s*\(max-width:\s*800px\)[\s\S]*?\.stage-workspace\s*\{[^}]*align-content:\s*start/s
  )
})
```

Delete `tests/floating-overlay-layout.test.mjs`, whose full-screen overlay expectations are intentionally replaced.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```bash
node --test tests/contained-stage-layout.test.mjs
```

Expected: four failures because `stage-workspace` does not exist and the current stage still fills the viewport.

- [ ] **Step 3: Group the stage and controls in `PixelExperience`**

Replace the `return` statement in `components/pixel-experience/PixelExperience.tsx` with:

```tsx
return (
  <main className="experience-shell">
    <ColorPanel palette={palette} onChange={handlePaletteChange} />

    <div className="stage-workspace">
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
    </div>
  </main>
)
```

- [ ] **Step 4: Replace viewport overlays with contained surface layout**

Replace the layout-related blocks in `app/globals.css` with:

```css
.experience-shell {
  width: 100%;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: clamp(300px, 25vw, 500px) minmax(0, 1fr);
  gap: clamp(24px, 2vw, 38px);
  padding: clamp(24px, 2.2vw, 42px);
  overflow: auto;
  background: var(--paper);
}

.color-panel {
  position: relative;
  z-index: 1;
  top: auto;
  right: auto;
  bottom: auto;
  left: auto;
  width: auto;
  min-height: calc(100dvh - clamp(48px, 4.4vw, 84px));
  padding: clamp(18px, 2vw, 28px);
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--line);
  box-shadow: 0 18px 46px rgba(23, 22, 27, 0.14);
}

.stage-workspace {
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto;
  align-content: center;
  gap: clamp(14px, 1.4vw, 22px);
}

.visual-stage {
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  margin: 0;
  overflow: hidden;
  background: var(--paper);
  border: 1px solid var(--line);
  box-shadow: 0 18px 46px rgba(23, 22, 27, 0.10);
}

.pixel-canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  background: var(--paper);
}

.control-deck {
  position: relative;
  z-index: 1;
  right: auto;
  bottom: auto;
  left: auto;
  width: 100%;
  margin: 0;
  display: grid;
  gap: 12px;
  padding: 14px;
  background: rgba(237, 236, 241, 0.96);
  border: 1px solid var(--line);
  box-shadow: 0 18px 46px rgba(23, 22, 27, 0.10);
}
```

Replace the layout portion of `@media (max-width: 800px)` with:

```css
@media (max-width: 800px) {
  .experience-shell {
    grid-template-columns: 1fr;
    min-height: 100dvh;
    height: auto;
    gap: 14px;
    padding: max(12px, env(safe-area-inset-top))
      max(12px, env(safe-area-inset-right))
      max(12px, env(safe-area-inset-bottom))
      max(12px, env(safe-area-inset-left));
    overflow: visible;
  }

  .color-panel {
    min-height: 0;
    width: auto;
    padding: 10px;
    overflow: visible;
  }

  .stage-workspace {
    align-content: start;
    gap: 12px;
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

Replace the landscape-height layout block with:

```css
@media (max-height: 700px) and (orientation: landscape) {
  .experience-shell {
    align-items: start;
    padding: 12px;
  }

  .color-panel {
    min-height: calc(100dvh - 24px);
  }

  .stage-workspace {
    align-content: start;
    gap: 8px;
  }

  .control-deck {
    gap: 8px;
    padding: 8px;
  }

  .drag-rail {
    height: 36px;
  }

  .rail-start,
  .rail-end {
    top: 11px;
  }
}
```

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
node --test tests/contained-stage-layout.test.mjs
```

Expected: four tests pass.

Run:

```bash
npm test
```

Expected: all tests pass with zero failures.

- [ ] **Step 6: Commit the contained layout**

```bash
git add components/pixel-experience/PixelExperience.tsx app/globals.css tests/contained-stage-layout.test.mjs tests/floating-overlay-layout.test.mjs
git commit -m "feat: contain pixel video in right stage"
```

---

### Task 2: Production Verification and Deployment

**Files:**
- Verify: files changed in Task 1
- Generated locally: `out/`

**Interfaces:**
- Consumes: the contained stage layout.
- Produces: refreshed local and GitHub Pages sites.

- [ ] **Step 1: Build and verify the static export**

Run:

```bash
npm run build
npm run verify:static
```

Expected: the Next.js build exits with code 0 and prints `Static export verified`.

- [ ] **Step 2: Run final repository checks**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: no whitespace errors and a clean `codex/audience-pixel-cctv` branch.

- [ ] **Step 3: Verify local routes**

With the existing `out/` preview at `127.0.0.1:3004`, run:

```bash
curl -fsSI http://127.0.0.1:3004/
curl -fsSI http://127.0.0.1:3004/media/cctv-1080p.mp4
curl -fsSI http://127.0.0.1:3004/media/if-and-only-if.mp3
```

Expected: all three return HTTP 200.

- [ ] **Step 4: Push the approved site update**

Run:

```bash
GIT_TERMINAL_PROMPT=0 git -c credential.https://github.com.helper= -c credential.https://github.com.helper=osxkeychain push https://github.com/eeeepeul/eeeepeul.github.io.git codex/audience-pixel-cctv:main
```

Expected: `codex/audience-pixel-cctv -> main`.

- [ ] **Step 5: Verify GitHub Pages**

Check the Pages workflow and public routes:

```bash
curl -fsSL 'https://api.github.com/repos/eeeepeul/eeeepeul.github.io/actions/workflows/pages.yml/runs?per_page=5'
curl -fsSI https://eeeepeul.github.io/
curl -fsSI https://eeeepeul.github.io/media/cctv-1080p.mp4
curl -fsSI https://eeeepeul.github.io/media/if-and-only-if.mp3
```

Expected: the workflow for the pushed commit completes successfully and all public routes return HTTP 200.
