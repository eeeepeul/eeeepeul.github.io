# Immediate Pixel Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the pixel CCTV immediately and move audible music start into a small control-deck button.

**Architecture:** Let the existing muted inline video use browser-native autoplay and looping while the WebGL canvas keeps rendering it. Keep the audio and Web Audio Kick analyzer behind the existing user-triggered `start()` call so mobile autoplay rules are respected.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL, native HTML video/audio, Node test runner

## Global Constraints

- Keep the approved `#EDECF1`, `#B70000`, and `#9AC2F0` palette unchanged.
- Keep H.264 output at 1920×1080 unchanged.
- Keep manual dragging, Kick sizing, audio/video synchronization, and recording behavior unchanged.
- Do not start audible audio or create the Web Audio graph until the user presses `음악 시작`.

---

### Task 1: Immediate pixel preview and compact music start control

**Files:**
- Create: `tests/immediate-start.test.mjs`
- Modify: `components/pixel-experience/PixelExperience.tsx`
- Modify: `app/globals.css`
- Modify: `tests/light-theme.test.mjs`

**Interfaces:**
- Consumes: `usePlaybackEngine().start(): Promise<boolean>` and `restart(): Promise<boolean>`
- Produces: muted looping preview on page load; `음악 시작` button before audio begins; `처음부터` button after audio begins

- [ ] **Step 1: Write the failing source-level behavior test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const experience = readFileSync(
  new URL('../components/pixel-experience/PixelExperience.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('shows the looping muted pixel preview without a start overlay', () => {
  assert.doesNotMatch(experience, /START EXPERIENCE|className="start-layer"/)
  assert.match(experience, /<PixelCanvas[\s\S]*?playing=\{true\}/)
  assert.match(experience, /<video[\s\S]*?autoPlay[\s\S]*?loop[\s\S]*?muted[\s\S]*?playsInline/)
  assert.doesNotMatch(css, /\.start-layer|\.start-copy|\.start-button|\.start-index/)
})

test('uses a compact user gesture to start audible music', () => {
  assert.match(experience, /hasStarted \? playback\.restart\(\) : playback\.start\(\)/)
  assert.match(experience, /'음악 시작'/)
  assert.match(experience, /'처음부터'/)
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/immediate-start.test.mjs`

Expected: FAIL because the start overlay still exists, the video lacks `autoPlay`/`loop`, and the compact button does not start music.

- [ ] **Step 3: Implement the minimal component change**

In `PixelExperience.tsx`, keep the renderer awake for the muted preview:

```tsx
<PixelCanvas
  video={playback.videoRef.current}
  tiles={tiles}
  playing={true}
  recording={recorder.recording}
  canvasRef={canvasRef}
  onError={handleWebglError}
/>
```

Configure the hidden source video for native muted preview playback:

```tsx
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
```

Delete the entire `{!hasStarted && <div className="start-layer">…</div>}` block. Replace the existing restart button with:

```tsx
<button
  className="action-button"
  type="button"
  onClick={() => void (hasStarted ? playback.restart() : playback.start())}
  disabled={playback.status === 'loading' || recorder.recording}
>
  {playback.status === 'loading' ? '시작 중' : hasStarted ? '처음부터' : '음악 시작'}
</button>
```

- [ ] **Step 4: Remove only the unused overlay styles**

Delete `.start-layer`, `.start-copy`, `.start-index`, `.start-copy h2`, `.start-copy p`, `.start-button`, its hover/disabled rules, and their mobile overrides from `app/globals.css`. Remove the `.start-index` selector from the shared small-label rule. In `tests/light-theme.test.mjs`, remove the assertion that expects `.start-layer`.

- [ ] **Step 5: Run focused and full tests and confirm GREEN**

Run: `node --test tests/immediate-start.test.mjs`

Expected: 2 tests pass.

Run: `npm test`

Expected: all existing and new tests pass.

- [ ] **Step 6: Commit the behavior change**

```bash
git add tests/immediate-start.test.mjs tests/light-theme.test.mjs components/pixel-experience/PixelExperience.tsx app/globals.css
git commit -m "feat: show pixel preview before music starts"
```

---

### Task 2: Build, local verification, and public deployment

**Files:**
- Verify generated output: `out/`
- No source files should change in this task

**Interfaces:**
- Consumes: the completed immediate-preview UI from Task 1
- Produces: refreshed local preview and deployed GitHub Pages site

- [ ] **Step 1: Build and verify the static site**

Run: `npm run build && npm run verify:static && git diff --check`

Expected: production build succeeds, `Static export verified` prints, and the diff check is silent.

- [ ] **Step 2: Refresh and verify the local site**

Keep the existing `python3 -m http.server 3004 --bind 127.0.0.1 --directory out` process running, restarting it only if it has stopped. Verify `/`, `/media/cctv-1080p.mp4`, and `/media/if-and-only-if.mp3` return HTTP 200.

- [ ] **Step 3: Push the feature branch to public `main` without force**

```bash
git fetch https://github.com/eeeepeul/eeeepeul.github.io.git main
git rev-list --left-right --count FETCH_HEAD...HEAD
git push https://github.com/eeeepeul/eeeepeul.github.io.git codex/audience-pixel-cctv:main
```

Expected: fetch comparison reports `0` remote-only commits and push fast-forwards `main`.

- [ ] **Step 4: Verify the deployed audience site**

Wait for the Pages workflow matching `git rev-parse HEAD` to complete successfully. Verify `https://eeeepeul.github.io/` and both media routes return HTTP 200, and the deployed JavaScript no longer contains `START EXPERIENCE`.
