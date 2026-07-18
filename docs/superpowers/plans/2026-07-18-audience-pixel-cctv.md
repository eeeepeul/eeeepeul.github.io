# Audience Pixel CCTV Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the EPEUL/MH:M site with a GitHub Pages-ready audiovisual experience where the supplied CCTV video loops under the supplied track, kick energy enlarges the pixel pattern automatically, and each visitor can independently drag to change the base pixel size.

**Architecture:** Keep the existing Next.js repository but replace its product surface with one client-only page. A WebGL renderer samples the looping H.264 video into four threshold bands and tile patterns; a Web Audio playback engine treats the MP3 as the master clock, computes a local kick envelope, and synchronizes the looping video. H.264 recording combines `canvas.captureStream()` with an audio recording destination only when the browser explicitly supports AVC MP4.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL 1, Web Audio API, MediaRecorder, Node's built-in test runner, GitHub Actions, GitHub Pages

## Global Constraints

- Replace the existing EPEUL/MH:M interface and inaccessible legacy routes while preserving `.git`, the license, and essential build configuration.
- Source video: `/Users/judy1103/Downloads/클링 cctv.mp4`.
- Source audio: `/Users/judy1103/Downloads/[track02] if and only if.mp3`.
- Audio is the master timeline and ends at approximately 264.072 seconds.
- CCTV video loops until the audio ends.
- Render/export composition is 1920×1080 at 16:9.
- Delivery/recording format is MP4 with H.264/AVC video; never silently substitute WebM.
- Kick analysis uses the supplied audio locally; do not request microphone permission.
- Audience state is local to each browser; no backend, shared state, Resolume, or stage control.
- GitHub Pages deployment must work below a repository base path.
- Pointer, touch, keyboard, and reduced-performance fallback behavior are required.

---

## File Structure

Create or retain only these product-facing units:

- `app/layout.tsx` — minimal metadata and document shell.
- `app/page.tsx` — renders the single experience.
- `app/globals.css` — complete site styling and responsive layout.
- `components/pixel-experience/PixelExperience.tsx` — top-level playback, rendering, drag, status, and export orchestration.
- `components/pixel-experience/PixelCanvas.tsx` — WebGL lifecycle and video-texture render loop.
- `components/pixel-experience/DragControl.tsx` — accessible pointer/keyboard pixel-size control.
- `components/pixel-experience/ExportButton.tsx` — H.264 availability and recording state UI.
- `hooks/usePlaybackEngine.ts` — audio graph, kick analysis, audio-master video sync, and end/restart behavior.
- `hooks/useH264Recorder.ts` — canvas/audio stream recording and MP4 download.
- `lib/asset-path.mjs` — repository-base-path-safe public asset URLs.
- `lib/pixel-controls.mjs` — pure tile-count, kick-combination, and threshold functions.
- `lib/kick-envelope.mjs` — pure FFT-band and kick-envelope functions.
- `lib/media-sync.mjs` — pure loop-time and drift calculations.
- `lib/export-support.mjs` — pure AVC MP4 MIME selection.
- `lib/pixel-shaders.ts` — vertex/fragment shader strings and renderer constants.
- `public/media/cctv-1080p.mp4` — normalized 1920×1080 H.264 source.
- `public/media/if-and-only-if.mp3` — supplied track.
- `tests/*.test.mjs` — Node unit tests for each pure boundary.
- `scripts/verify-static.mjs` — verifies the exported site and absence of old product strings.
- `.github/workflows/pages.yml` — static build and GitHub Pages deployment.

Remove old `app`, product `components`, `css`, `data`, `faq`, `layouts`, legacy content-generation scripts, EPEUL assets, root EPEUL previews/captures, and server routes after confirming the exact tracked list with `git ls-files`.

---

### Task 1: Replace the Legacy Product Shell and Normalize Media

**Files:**
- Delete: legacy product files under `app/`, `components/`, `css/`, `data/`, `faq/`, `layouts/`, `scripts/`, `public/static/audio/epeul/`, `public/static/images/epeul/`, and root `epeul-*`/`blank-preview.html`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `components/pixel-experience/PixelExperience.tsx`
- Create: `lib/asset-path.mjs`
- Create: `tests/asset-path.test.mjs`
- Create: `public/media/cctv-1080p.mp4`
- Create: `public/media/if-and-only-if.mp3`
- Modify: `next.config.js`
- Modify: `package.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Produces: `assetPath(path: string, basePath?: string): string`
- Produces: a static-exportable single-page Next.js shell.
- Produces: stable media URLs `/media/cctv-1080p.mp4` and `/media/if-and-only-if.mp3`.

- [ ] **Step 1: Capture the exact deletion set and confirm it excludes repository metadata**

Run:

```bash
git ls-files app components css data faq layouts scripts public/static/audio/epeul public/static/images/epeul | sort
git ls-files 'epeul-*' blank-preview.html | sort
```

Expected: only old product code/assets are listed; `.git`, `LICENSE`, `AGENTS.md`, `docs/superpowers`, package manager files, and `.github/workflows/pages.yml` are absent.

- [ ] **Step 2: Write the failing asset-path tests**

Create `tests/asset-path.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { assetPath } from '../lib/asset-path.mjs'

test('returns a root asset path without a base path', () => {
  assert.equal(assetPath('media/cctv-1080p.mp4'), '/media/cctv-1080p.mp4')
})

test('prefixes a normalized GitHub Pages base path', () => {
  assert.equal(assetPath('/media/if-and-only-if.mp3', '/pixel-site/'), '/pixel-site/media/if-and-only-if.mp3')
})
```

- [ ] **Step 3: Run the asset-path tests and verify failure**

Run: `node --test tests/asset-path.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/asset-path.mjs`.

- [ ] **Step 4: Implement the asset-path boundary**

Create `lib/asset-path.mjs`:

```js
export function assetPath(path, basePath = process.env.NEXT_PUBLIC_BASE_PATH || '') {
  const normalizedBase = basePath === '/' ? '' : `/${basePath.split('/').filter(Boolean).join('/')}`
  const normalizedPath = `/${path.split('/').filter(Boolean).join('/')}`
  return `${normalizedBase}${normalizedPath}`
}
```

- [ ] **Step 5: Replace the product shell and static-export configuration**

Set `next.config.js` to a plain configuration with `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`, and `env.NEXT_PUBLIC_BASE_PATH` derived from `BASE_PATH`. Remove Contentlayer, bundle-analyzer, dynamic headers, and server-only configuration.

Use this shape:

```js
const basePath = process.env.BASE_PATH || ''

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}
```

Set `app/layout.tsx` metadata to `Pixel CCTV — if and only if`, import `./globals.css`, use `lang="ko"`, and render only `{children}`. Set `app/page.tsx` to render `PixelExperience`.

Create a temporary `PixelExperience.tsx` that renders a full-screen `<main>` with the title, `Preparing visual…`, and no legacy imports.

Replace `package.json` scripts with:

```json
{
  "dev": "next dev -H 127.0.0.1 -p 3004",
  "build": "next build",
  "start": "next start",
  "test": "node --test tests/*.test.mjs",
  "verify:static": "node scripts/verify-static.mjs"
}
```

Keep the current Next/React runtime dependencies until the new build passes; remove unused legacy dependencies only after static verification so lockfile churn cannot hide product regressions.

- [ ] **Step 6: Normalize and copy source media**

Run:

```bash
mkdir -p public/media
avconvert --source '/Users/judy1103/Downloads/클링 cctv.mp4' --preset Preset1920x1080 --output public/media/cctv-1080p.mp4 --replace --disableMetadataFilter
cp '/Users/judy1103/Downloads/[track02] if and only if.mp3' public/media/if-and-only-if.mp3
```

Expected: both files exist, are non-empty, and the video opens at 1920×1080 in a browser media element. Do not alter the source files in Downloads.

- [ ] **Step 7: Remove the confirmed legacy product files and create the new shell**

Use `git rm` for the confirmed tracked old product paths so the deletion is versioned and recoverable. Recreate only the files in this plan's File Structure. Preserve the design/plan documents, GitHub workflow, repository metadata, and license.

- [ ] **Step 8: Verify the minimal shell**

Run:

```bash
node --test tests/asset-path.test.mjs
yarn build
```

Expected: 2 unit tests PASS; Next static export finishes and creates `out/index.html`.

- [ ] **Step 9: Commit the shell replacement**

```bash
git add -A
git commit -m "feat: replace legacy site with pixel experience shell"
```

---

### Task 2: Build the Four-Band WebGL Pixel Renderer

**Files:**
- Create: `lib/pixel-controls.mjs`
- Create: `lib/pixel-shaders.ts`
- Create: `components/pixel-experience/PixelCanvas.tsx`
- Create: `tests/pixel-controls.test.mjs`
- Modify: `components/pixel-experience/PixelExperience.tsx`

**Interfaces:**
- Produces: `manualTilesFromPosition(position: number): number`.
- Produces: `effectiveTiles(baseTiles: number, kick: number, kickAmount?: number): number`.
- Produces: `classifyBand(luminance: number, thresholds?: readonly number[]): 0 | 1 | 2 | 3`.
- Produces: `<PixelCanvas video: HTMLVideoElement | null; tiles: number; kick: number; exportCanvasRef: RefObject<HTMLCanvasElement | null> />`.

- [ ] **Step 1: Write failing pixel-control tests**

Create `tests/pixel-controls.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyBand, effectiveTiles, manualTilesFromPosition } from '../lib/pixel-controls.mjs'

test('drag position maps from small to large pixels', () => {
  assert.equal(manualTilesFromPosition(0), 180)
  assert.equal(manualTilesFromPosition(1), 12)
})

test('kick enlarges pixels by reducing tile count', () => {
  assert.equal(effectiveTiles(100, 0), 100)
  assert.equal(effectiveTiles(100, 1, 0.45), 55)
})

test('luminance maps into four stable bands', () => {
  assert.deepEqual([0.1, 0.3, 0.6, 0.9].map((value) => classifyBand(value)), [0, 1, 2, 3])
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `node --test tests/pixel-controls.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement pure pixel controls**

Create `lib/pixel-controls.mjs`:

```js
export const DEFAULT_THRESHOLDS = [0.22, 0.46, 0.72]

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function manualTilesFromPosition(position) {
  return Math.round(180 - clamp(position, 0, 1) * 168)
}

export function effectiveTiles(baseTiles, kick, kickAmount = 0.45) {
  return Math.max(8, Math.round(baseTiles * (1 - clamp(kick, 0, 1) * kickAmount)))
}

export function classifyBand(luminance, thresholds = DEFAULT_THRESHOLDS) {
  if (luminance < thresholds[0]) return 0
  if (luminance < thresholds[1]) return 1
  if (luminance < thresholds[2]) return 2
  return 3
}
```

- [ ] **Step 4: Run the pixel tests and verify pass**

Run: `node --test tests/pixel-controls.test.mjs`

Expected: 3 tests PASS.

- [ ] **Step 5: Define shaders with square output-space tiles and reference patterns**

Create `lib/pixel-shaders.ts` exporting `VERTEX_SHADER` and `FRAGMENT_SHADER`. The fragment shader must:

```glsl
precision mediump float;
uniform sampler2D uVideo;
uniform vec2 uResolution;
uniform float uColumns;
varying vec2 vUv;

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  float rows = max(1.0, floor(uColumns * uResolution.y / uResolution.x));
  vec2 grid = vec2(uColumns, rows);
  vec2 cell = floor(vUv * grid);
  vec2 local = fract(vUv * grid);
  vec2 sampleUv = (cell + 0.5) / grid;
  float luma = luminance(texture2D(uVideo, sampleUv).rgb);

  vec3 dark = vec3(0.015, 0.020, 0.016);
  vec3 grey = vec3(0.73, 0.75, 0.69);
  vec3 green = vec3(0.44, 0.68, 0.48);
  vec3 bone = vec3(0.92, 0.94, 0.84);
  float diagonal = step(0.48, fract((local.x + local.y) * 3.0));
  float radius = distance(local, vec2(0.5));
  float ring = step(0.23, radius) * (1.0 - step(0.38, radius));

  vec3 outputColor = dark;
  if (luma >= 0.22 && luma < 0.46) outputColor = mix(dark, grey, diagonal);
  if (luma >= 0.46 && luma < 0.72) outputColor = mix(dark, green, ring);
  if (luma >= 0.72) outputColor = bone;
  gl_FragColor = vec4(outputColor, 1.0);
}
```

The component must compile/link shaders, upload the hidden video as a texture on each frame, set the canvas to a 16:9 surface, cap interactive rendering to a safe DPR, and render at 1920×1080 when recording.

- [ ] **Step 6: Implement `PixelCanvas` and connect the hidden video**

`PixelCanvas` must expose the canvas ref used by recording, pause `requestAnimationFrame` when playback is idle, show a clear error callback when WebGL fails, and release textures/programs/listeners on unmount.

- [ ] **Step 7: Verify renderer build and visual output**

Run:

```bash
node --test tests/pixel-controls.test.mjs
yarn build
yarn dev
```

Expected: tests PASS, build succeeds, and the page shows four distinct tile treatments over the CCTV frame without WebGL console errors.

- [ ] **Step 8: Commit the renderer**

```bash
git add lib components app tests
git commit -m "feat: render CCTV as four-band pixel patterns"
```

---

### Task 3: Add Audio-Master Playback, Kick Detection, and Video Loop Sync

**Files:**
- Create: `lib/kick-envelope.mjs`
- Create: `lib/media-sync.mjs`
- Create: `hooks/usePlaybackEngine.ts`
- Create: `tests/kick-envelope.test.mjs`
- Create: `tests/media-sync.test.mjs`
- Modify: `components/pixel-experience/PixelExperience.tsx`

**Interfaces:**
- Produces: `bandEnergy(frequencyData, sampleRate, fftSize, minHz?, maxHz?): number`.
- Produces: `nextKickEnvelope(state, energy, deltaMs): KickEnvelopeState`.
- Produces: `loopedVideoTime(audioTime, videoDuration): number`.
- Produces: `wrappedTimeDistance(actual, expected, duration): number`.
- Produces hook state `{ status, kick, currentTime, duration, start, restart, audioRef, videoRef, recordingAudioStream }`.

- [ ] **Step 1: Write failing kick and sync tests**

Create deterministic tests that assert:

```js
assert.equal(bandEnergy(new Uint8Array([0, 255, 255, 0]), 400, 8, 50, 150), 1)
assert.ok(nextKickEnvelope({ floor: 0.1, envelope: 0 }, 0.8, 16).envelope > 0.6)
assert.ok(nextKickEnvelope({ floor: 0.1, envelope: 1 }, 0.05, 160).envelope < 0.5)
assert.equal(loopedVideoTime(12.5, 5), 2.5)
assert.ok(wrappedTimeDistance(0.05, 4.95, 5) < 0.11)
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/kick-envelope.test.mjs tests/media-sync.test.mjs`

Expected: FAIL with missing module errors.

- [ ] **Step 3: Implement FFT energy and envelope math**

`bandEnergy` converts 40–160 Hz to analyzer bin indices, averages byte magnitudes, and returns 0–1. `nextKickEnvelope` tracks a slowly adapting noise floor, uses a fast attack when energy exceeds `floor + 0.08`, and applies exponential release near 160 ms. Clamp all outputs to 0–1 and return a new immutable state.

- [ ] **Step 4: Implement audio-master loop synchronization**

`loopedVideoTime` returns safe modulo time for finite positive duration. `wrappedTimeDistance` compares positions across the loop seam. The hook resynchronizes only when drift exceeds 0.12 seconds so routine decode jitter does not cause visible seeking.

- [ ] **Step 5: Run unit tests and verify pass**

Run: `node --test tests/kick-envelope.test.mjs tests/media-sync.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Implement `usePlaybackEngine`**

The hook must:

- create one `AudioContext`, `MediaElementAudioSourceNode`, `AnalyserNode`, and `MediaStreamAudioDestinationNode` after the Start gesture;
- connect the source to both speakers and the recording destination;
- use `fftSize = 2048` and sample 40–160 Hz;
- call `effectiveTiles(baseTiles, kick)` through the parent state;
- start audio and video from zero, with audio as master;
- loop video while audio is playing;
- stop animation/video when the audio `ended` event fires;
- resynchronize on `visibilitychange`;
- close/disconnect the audio graph on unmount.

- [ ] **Step 7: Verify playback behavior**

Run `yarn dev`, click Start, and observe:

- audio/video begin together after the gesture;
- pixel size pulses on audible kicks;
- manually seek video near its end and confirm it loops without restarting audio;
- background/foreground the tab and confirm video returns to the audio clock;
- use browser devtools to verify no microphone permission request appears.

- [ ] **Step 8: Commit playback and kick detection**

```bash
git add hooks lib components tests
git commit -m "feat: sync looping video to kick-reactive audio"
```

---

### Task 4: Add Independent Drag Interaction and Responsive Experience UI

**Files:**
- Create: `components/pixel-experience/DragControl.tsx`
- Modify: `components/pixel-experience/PixelExperience.tsx`
- Modify: `app/globals.css`
- Modify: `tests/pixel-controls.test.mjs`

**Interfaces:**
- Consumes: `manualTilesFromPosition(position)` and `effectiveTiles(baseTiles, kick)`.
- Produces: `pointerPosition(clientX: number, left: number, width: number): number`.
- Produces: `<DragControl value: number; onChange(value: number): void; disabled?: boolean />` where value is normalized 0–1.

- [ ] **Step 1: Extend failing interaction math tests**

Add these assertions before defining `pointerPosition`:

```js
import { pointerPosition } from '../lib/pixel-controls.mjs'

assert.equal(pointerPosition(100, 100, 200), 0)
assert.equal(pointerPosition(200, 100, 200), 0.5)
assert.equal(pointerPosition(400, 100, 200), 1)
```

- [ ] **Step 2: Run the interaction test and verify failure**

Run: `node --test tests/pixel-controls.test.mjs`

Expected: FAIL because `pointerPosition` is not exported.

- [ ] **Step 3: Implement the accessible drag control**

Add this pure function to `lib/pixel-controls.mjs`:

```js
export function pointerPosition(clientX, left, width) {
  if (!Number.isFinite(width) || width <= 0) return 0
  return clamp((clientX - left) / width, 0, 1)
}
```

Then implement `DragControl` with Pointer Events and pointer capture; convert `clientX` with `pointerPosition`; update on pointer down/move; support ArrowLeft/ArrowDown by -0.025, ArrowRight/ArrowUp by +0.025, Home=0, End=1; expose `role="slider"`, `aria-valuemin`, `aria-valuemax`, and an `aria-valuetext` reporting the effective tile count.

- [ ] **Step 4: Implement the final experience layout**

The page must include:

- a full-screen black/green 16:9 visual stage;
- hidden source `<video muted playsInline preload="auto">` and `<audio preload="auto">` elements using `assetPath`;
- initial title, concise Korean instruction, and Start button;
- current time / 4:24 display;
- drag rail and handle below or over the letterbox-safe area;
- Restart and Export actions after start;
- loading, media error, WebGL error, ended, and recording states;
- no former navigation, blog routes, or EPEUL copy.

- [ ] **Step 5: Add responsive and motion CSS**

Use `100dvh`, safe-area insets, `touch-action: none` only on the drag rail, `prefers-reduced-motion`, portrait letterboxing, visible focus states, and a DPR/render-resolution cap. Avoid cards and dashboard styling; the video surface remains dominant.

- [ ] **Step 6: Verify interaction independently in two sessions**

Open two browser windows. Drag each to a different base size and confirm neither affects the other. Test mouse, keyboard, and mobile viewport touch emulation. Confirm Kick pulses are added on top of each distinct base size.

- [ ] **Step 7: Commit the final interaction UI**

```bash
git add app components tests
git commit -m "feat: add independent audience pixel controls"
```

---

### Task 5: Add Strict H.264 MP4 Recording

**Files:**
- Create: `lib/export-support.mjs`
- Create: `hooks/useH264Recorder.ts`
- Create: `components/pixel-experience/ExportButton.tsx`
- Create: `tests/export-support.test.mjs`
- Modify: `components/pixel-experience/PixelExperience.tsx`

**Interfaces:**
- Produces: `pickH264Mime(isTypeSupported: (mime: string) => boolean): string | null`.
- Produces hook API `{ supported, recording, error, startRecording, stopRecording }`.
- Consumes: processed canvas and `recordingAudioStream` from `usePlaybackEngine`.

- [ ] **Step 1: Write failing MIME-selection tests**

Create `tests/export-support.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { pickH264Mime } from '../lib/export-support.mjs'

test('selects an explicit AVC MP4 type', () => {
  const supported = new Set(['video/mp4;codecs=avc1.42E01E,mp4a.40.2'])
  assert.equal(pickH264Mime((mime) => supported.has(mime)), 'video/mp4;codecs=avc1.42E01E,mp4a.40.2')
})

test('does not silently fall back to WebM or generic MP4', () => {
  assert.equal(pickH264Mime((mime) => mime === 'video/webm' || mime === 'video/mp4'), null)
})
```

- [ ] **Step 2: Run the export test and verify failure**

Run: `node --test tests/export-support.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement strict AVC MIME selection**

Create `lib/export-support.mjs`:

```js
const AVC_MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
]

export function pickH264Mime(isTypeSupported) {
  return AVC_MIME_TYPES.find((mime) => isTypeSupported(mime)) || null
}
```

- [ ] **Step 4: Run export tests and verify pass**

Run: `node --test tests/export-support.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 5: Implement the recorder hook**

`useH264Recorder` must:

- reject recording when `pickH264Mime(MediaRecorder.isTypeSupported)` returns null;
- set the canvas backing store to 1920×1080 while recording;
- call `canvas.captureStream(30)`;
- merge the canvas video track and the provided audio destination track into one `MediaStream`;
- create `MediaRecorder` with the selected AVC type, `videoBitsPerSecond: 8_000_000`, and `audioBitsPerSecond: 192_000`;
- collect chunks, create an `video/mp4` Blob, and download `if-and-only-if-pixel-cctv.mp4`;
- start recording before restarting playback from zero;
- stop on audio end or user cancellation;
- restore interactive canvas sizing and stop capture tracks after completion;
- surface recorder errors without downloading a corrupt file.

- [ ] **Step 6: Implement Export UI and capability messaging**

Show Export only after media is ready. If unsupported, keep the control disabled and display `이 브라우저는 H.264 MP4 녹화를 지원하지 않습니다. 데스크톱 Chrome 또는 Safari에서 열어주세요.` Never offer a WebM fallback under the H.264 label.

- [ ] **Step 7: Verify a short recording before the full track**

In the production Mac browser, temporarily stop after 10 seconds, download the MP4, open it in QuickTime, and confirm image, audio, pixel reaction, and 1920×1080 dimensions. Remove the temporary 10-second cutoff, then record the complete 264.072-second track once.

- [ ] **Step 8: Commit H.264 export**

```bash
git add components hooks lib tests
git commit -m "feat: record the pixel experience as H264 MP4"
```

---

### Task 6: Add Static Verification and GitHub Pages Deployment

**Files:**
- Create: `scripts/verify-static.mjs`
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `yarn verify:static`, which exits nonzero when required exported files are absent or legacy product markers remain.
- Produces: GitHub Pages deployment from `main` using repository base path.

- [ ] **Step 1: Write the static verifier before relying on deployment**

Create `scripts/verify-static.mjs` to assert:

```js
const required = ['out/index.html', 'out/media/cctv-1080p.mp4', 'out/media/if-and-only-if.mp3']
const forbidden = ['EPEUL', 'MH:M', '/api/newsletter']
```

It must check every required path exists and is non-empty, recursively read exported HTML/JS/CSS text files, fail when a forbidden marker is present, and print `Static export verified` only on success.

- [ ] **Step 2: Run verification before build and confirm failure**

Run: `yarn verify:static`

Expected: FAIL when `out/` is missing or stale.

- [ ] **Step 3: Update the Pages workflow**

Keep `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, and `actions/deploy-pages@v4`. Build with:

```yaml
- run: yarn install --immutable
- run: yarn test
- run: yarn build
  env:
    BASE_PATH: ${{ steps.configurepages.outputs.base_path }}
- run: yarn verify:static
```

Remove obsolete `EXPORT` and `UNOPTIMIZED` flags because `next.config.js` now always performs static export.

- [ ] **Step 4: Update README with exact local and Pages commands**

Document `yarn install`, `yarn dev`, `yarn test`, `yarn build`, `yarn verify:static`, media sources, Start/autoplay behavior, H.264 browser limitation, and GitHub Pages setup under repository Settings → Pages → GitHub Actions.

- [ ] **Step 5: Run full verification**

Run:

```bash
yarn test
yarn build
yarn verify:static
git grep -n -E 'EPEUL|MH:M|api/newsletter' -- ':!docs/superpowers/**'
git status --short
```

Expected: all tests PASS; static build succeeds; verifier prints `Static export verified`; grep returns no product-code matches outside historical design docs; status shows only intended Task 6 changes.

- [ ] **Step 6: Commit deployment and verification**

```bash
git add .github/workflows/pages.yml README.md package.json scripts/verify-static.mjs
git commit -m "ci: deploy the pixel experience to GitHub Pages"
```

---

### Task 7: Final Browser QA, Performance Check, and Publication

**Files:**
- Modify only files implicated by verified QA defects.
- Verify: `out/`, exported MP4, and GitHub Pages deployment.

**Interfaces:**
- Consumes the complete site.
- Produces a verified local build, a verified full H.264 recording on a supported Mac browser, and a published GitHub Pages site when a Git remote is available.

- [ ] **Step 1: Run the complete automated gate from a clean checkout state**

Run:

```bash
yarn test
yarn build
yarn verify:static
git status --short
```

Expected: tests/build/verifier pass and working tree is clean before QA changes.

- [ ] **Step 2: Perform desktop visual QA**

Open the production build at 1920×1080. Verify Start, audio/video sync, four tile bands, kick pulse, drag, Restart, ended state, unsupported export messaging, focus rings, and no console errors. Capture a screenshot for comparison with the approved reference.

- [ ] **Step 3: Perform mobile QA**

Test representative 390×844 and 412×915 viewports. Confirm touch drag uses pointer capture without scrolling the page, controls remain inside safe areas, the artwork keeps 16:9, and sustained playback does not visibly stall. If performance drops, cap interactive rendering to 30 fps or lower DPR without changing the audio clock.

- [ ] **Step 4: Record and inspect the full result**

On a browser that passes `pickH264Mime`, export the complete track. Open the output in QuickTime and confirm duration near 264.072 seconds, 1920×1080 dimensions, audible track, looping CCTV, and processed pixel visuals from start to end.

- [ ] **Step 5: Re-run the automated gate after any QA fix**

Run: `yarn test && yarn build && yarn verify:static`

Expected: all commands exit 0.

- [ ] **Step 6: Commit any QA-only corrections**

If QA produced code changes:

```bash
git add -A
git commit -m "fix: harden pixel experience playback and layout"
```

If there are no changes, do not create an empty commit.

- [ ] **Step 7: Publish through GitHub**

Run `git remote -v`. If a remote exists and the user has authorized publication, push the current branch and observe the Pages workflow until deployment succeeds. If no remote exists, stop before creating an external repository and ask the user which GitHub repository should receive the site; do not invent an owner or repository name.
