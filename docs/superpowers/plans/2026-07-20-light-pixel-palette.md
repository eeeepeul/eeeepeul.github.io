# Pixel CCTV Light Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Pixel CCTV to the approved light palette while preserving playback, pixel masks, responsive layout, Kick-driven pixel sizing, local controls, and H.264 export behavior.

**Architecture:** Keep the existing Next.js component and WebGL boundaries. Task 1 changes only fragment-shader colors and removes the obsolete Kick color tint; Task 2 remaps CSS and viewport colors without changing layout or interaction. Existing static export and GitHub Pages deployment remain unchanged.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL 1 fragment shaders, CSS, Node.js test runner, GitHub Pages

## Global Constraints

- Page, stage, canvas, and unlit pixel background: `#EDECF1`.
- Ring pixels: `#B70000`.
- Diagonal and solid square pixels: `#9AC2F0`.
- Primary interface text: `#17161B`; secondary text: `#6C6873`; hairlines: `rgba(23, 22, 27, 0.20)`.
- Kick changes pixel size only and must not modify output colors.
- Do not change luminance thresholds, masks, text, layout, controls, media, export format, or playback behavior.
- Preserve the existing package manager, lockfile, static export, and GitHub Pages workflow.

---

## File Structure

- `tests/pixel-palette.test.mjs`: source-level regression checks for exact WebGL color roles and removal of Kick color tint.
- `lib/pixel-shaders.ts`: approved WebGL colors and unchanged four-band mask logic.
- `components/pixel-experience/PixelCanvas.tsx`: removes the no-longer-used Kick shader prop and uniform.
- `components/pixel-experience/PixelExperience.tsx`: stops forwarding Kick to the canvas while continuing to calculate Kick-adjusted tile count.
- `tests/light-theme.test.mjs`: regression checks for light color scheme, CSS palette, canvas fallback, and viewport theme color.
- `app/globals.css`: complete dark-to-light interface palette remap.
- `app/layout.tsx`: light browser theme color.

### Task 1: Exact WebGL Pixel Palette

**Files:**
- Create: `tests/pixel-palette.test.mjs`
- Modify: `lib/pixel-shaders.ts`
- Modify: `components/pixel-experience/PixelCanvas.tsx`
- Modify: `components/pixel-experience/PixelExperience.tsx`

**Interfaces:**
- Consumes: `tiles: number` from `effectiveTiles(baseTiles, playback.kick)`.
- Produces: `FRAGMENT_SHADER` with exact background, blue, and red `vec3` values; `PixelCanvasProps` without a `kick` field.

- [ ] **Step 1: Write the failing shader palette test**

Create `tests/pixel-palette.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shaderSource = readFileSync(new URL('../lib/pixel-shaders.ts', import.meta.url), 'utf8')

test('shader maps the four luminance bands to the approved palette', () => {
  assert.match(shaderSource, /vec3 backgroundColor = vec3\(0\.929412, 0\.925490, 0\.945098\)/)
  assert.match(shaderSource, /vec3 blue = vec3\(0\.603922, 0\.760784, 0\.941176\)/)
  assert.match(shaderSource, /vec3 red = vec3\(0\.717647, 0\.000000, 0\.000000\)/)
  assert.match(shaderSource, /mix\(backgroundColor, blue, diagonal \* border\)/)
  assert.match(shaderSource, /mix\(backgroundColor, red, ring \* border\)/)
  assert.match(shaderSource, /mix\(backgroundColor, blue, border\)/)
})

test('kick does not tint the shader output color', () => {
  assert.doesNotMatch(shaderSource, /uniform float uKick/)
  assert.doesNotMatch(shaderSource, /outputColor\s*\+=/)
})
```

- [ ] **Step 2: Run the test and verify the red state**

Run: `node --test tests/pixel-palette.test.mjs`

Expected: FAIL because the current shader contains the dark/grey/green/bone palette and `uKick` tint.

- [ ] **Step 3: Apply the minimal shader palette implementation**

In `lib/pixel-shaders.ts`, keep `VERTEX_SHADER` unchanged and replace `FRAGMENT_SHADER` with:

```ts
export const FRAGMENT_SHADER = `
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

  vec3 backgroundColor = vec3(0.929412, 0.925490, 0.945098);
  vec3 blue = vec3(0.603922, 0.760784, 0.941176);
  vec3 red = vec3(0.717647, 0.000000, 0.000000);
  float border = step(0.045, local.x) * step(0.045, local.y)
    * step(local.x, 0.955) * step(local.y, 0.955);
  float diagonal = step(0.50, fract((local.x + local.y) * 3.0));
  float radius = distance(local, vec2(0.5));
  float ring = step(0.22, radius) * (1.0 - step(0.38, radius));

  vec3 outputColor = backgroundColor;
  if (luma >= 0.22 && luma < 0.46) outputColor = mix(backgroundColor, blue, diagonal * border);
  if (luma >= 0.46 && luma < 0.72) outputColor = mix(backgroundColor, red, ring * border);
  if (luma >= 0.72) outputColor = mix(backgroundColor, blue, border);
  gl_FragColor = vec4(outputColor, 1.0);
}
`
```

In `PixelCanvas.tsx`, remove `kick` from `PixelCanvasProps`, the component parameters, `valuesRef`, the synchronization effect, and `gl.uniform1f(gl.getUniformLocation(program, 'uKick'), current.kick)`. The retained state must be:

```tsx
type PixelCanvasProps = {
  video: HTMLVideoElement | null
  tiles: number
  playing: boolean
  recording: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onError: (message: string) => void
}

const valuesRef = useRef({ video, tiles, playing, recording })

useEffect(() => {
  valuesRef.current = { video, tiles, playing, recording }
  wakeRendererRef.current()
}, [video, tiles, playing, recording])
```

In `PixelExperience.tsx`, retain the Kick-adjusted `tiles` calculation but remove only the `kick={playback.kick}` prop from `<PixelCanvas>`.

- [ ] **Step 4: Run the focused and complete test suites**

Run: `node --test tests/pixel-palette.test.mjs`

Expected: 2 tests pass, 0 fail.

Run: `npm test`

Expected: all tests pass with 0 failures.

- [ ] **Step 5: Commit the shader palette change**

```bash
git add tests/pixel-palette.test.mjs lib/pixel-shaders.ts components/pixel-experience/PixelCanvas.tsx components/pixel-experience/PixelExperience.tsx
git commit -m "feat: apply light WebGL pixel palette"
```

### Task 2: Light Interface Palette

**Files:**
- Create: `tests/light-theme.test.mjs`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: the approved design tokens from `docs/superpowers/specs/2026-07-20-light-palette-design.md`.
- Produces: a light document color scheme and a `#EDECF1` interface/canvas fallback with unchanged layout selectors.

- [ ] **Step 1: Write the failing light-theme test**

Create `tests/light-theme.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')

test('document declares the approved light interface palette', () => {
  assert.match(css, /color-scheme:\s*light/)
  assert.match(css, /--paper:\s*#EDECF1/i)
  assert.match(css, /--foreground:\s*#17161B/i)
  assert.match(css, /--muted:\s*#6C6873/i)
  assert.match(css, /--blue:\s*#9AC2F0/i)
  assert.match(css, /--red:\s*#B70000/i)
  assert.doesNotMatch(css, /color-scheme:\s*dark/)
})

test('stage and canvas fallback use the light background', () => {
  assert.match(css, /\.visual-stage\s*\{[^}]*background:\s*var\(--paper\)/s)
  assert.match(css, /\.pixel-canvas\s*\{[^}]*background:\s*var\(--paper\)/s)
  assert.match(css, /\.start-layer\s*\{[^}]*rgba\(237,\s*236,\s*241/s)
})

test('browser viewport uses the light theme color', () => {
  assert.match(layout, /themeColor:\s*'#EDECF1'/)
})
```

- [ ] **Step 2: Run the test and verify the red state**

Run: `node --test tests/light-theme.test.mjs`

Expected: FAIL because the document currently declares `color-scheme: dark`, has no light tokens, and uses `themeColor: '#090c0a'`.

- [ ] **Step 3: Apply the minimal CSS and viewport palette**

Replace the root token block with:

```css
:root {
  color-scheme: light;
  --paper: #EDECF1;
  --foreground: #17161B;
  --muted: #6C6873;
  --line: rgba(23, 22, 27, 0.20);
  --blue: #9AC2F0;
  --red: #B70000;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  background: var(--paper);
  color: var(--foreground);
}
```

Apply these exact role replacements while leaving every layout property unchanged:

```css
html, body { background: var(--paper); }
button:focus-visible, [role="slider"]:focus-visible { outline-color: var(--red); }
.status-light { background: rgba(23, 22, 27, 0.28); }
.status-light.is-live { background: var(--red); box-shadow: 0 0 12px rgba(183, 0, 0, 0.28); }
.visual-stage { background: var(--paper); border-color: var(--line); }
.pixel-canvas { background: var(--paper); }
.stage-meta { color: rgba(23, 22, 27, 0.62); mix-blend-mode: normal; }
.start-layer { background: linear-gradient(110deg, rgba(237, 236, 241, 0.96) 0%, rgba(237, 236, 241, 0.87) 48%, rgba(237, 236, 241, 0.68) 100%); }
.start-index { color: var(--red); }
.start-copy p { color: var(--muted); }
.start-button { border-color: var(--foreground); background: var(--foreground); color: var(--paper); }
.start-button:hover:not(:disabled) { border-color: var(--red); background: var(--red); }
.timeline { background: rgba(23, 22, 27, 0.14); }
.timeline span { background: var(--foreground); }
.drag-copy output { color: var(--foreground); }
.drag-rail { border-top-color: rgba(23, 22, 27, 0.56); border-bottom-color: var(--line); }
.drag-rail::before { background: repeating-linear-gradient(90deg, rgba(23, 22, 27, 0.13) 0 1px, transparent 1px 3.125%); }
.rail-start, .rail-end { color: rgba(23, 22, 27, 0.52); }
.drag-fill { background: rgba(154, 194, 240, 0.28); border-right-color: var(--red); }
.drag-handle { border-color: var(--red); background: var(--paper); }
.drag-handle span { background: var(--red); }
.kick-monitor i { background: rgba(23, 22, 27, 0.12); }
.kick-monitor b { background: var(--blue); }
.action-button { border-color: rgba(23, 22, 27, 0.40); }
.action-button:hover:not(:disabled) { border-color: var(--red); color: var(--red); }
.action-button:disabled { color: rgba(23, 22, 27, 0.38); border-color: rgba(23, 22, 27, 0.18); }
.recording-button { color: var(--red); border-color: var(--red); }
.record-dot { background: var(--red); }
.error-note { color: var(--red); }
.site-footer { color: var(--muted); }
```

Retain each selector's existing geometry, spacing, typography, and interaction properties. Replace all remaining references to `--ink`, `--bone`, `--green`, and `--acid` with the approved role tokens.

In `app/layout.tsx`, change the viewport color only:

```ts
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#EDECF1',
}
```

- [ ] **Step 4: Run focused tests, complete tests, and type/build checks**

Run: `node --test tests/light-theme.test.mjs`

Expected: 3 tests pass, 0 fail.

Run: `npm test`

Expected: all tests pass with 0 failures.

Run: `npm run build`

Expected: Next.js compiles, type-checks, and exports `/` successfully.

- [ ] **Step 5: Commit the interface palette change**

```bash
git add tests/light-theme.test.mjs app/globals.css app/layout.tsx
git commit -m "feat: convert Pixel CCTV to light mode"
```

### Task 3: Static, Local, and Published Verification

**Files:**
- Verify: `out/index.html`
- Verify: `out/media/cctv-1080p.mp4`
- Verify: `out/media/if-and-only-if.mp3`
- No source files change.

**Interfaces:**
- Consumes: production output from Task 2.
- Produces: verified local output and a successful GitHub Pages deployment of the current branch to `main`.

- [ ] **Step 1: Verify the static export**

Run: `npm run verify:static`

Expected: `Static export verified`.

Run: `git diff --check`

Expected: exit 0 with no output.

- [ ] **Step 2: Verify the retained local server output**

Run: `curl -fsSI http://127.0.0.1:3004/`

Expected: HTTP 200 and `Content-type: text/html`.

Run: `curl -fsSI http://127.0.0.1:3004/media/cctv-1080p.mp4`

Expected: HTTP 200 and `Content-type: video/mp4`.

Run: `curl -fsSI http://127.0.0.1:3004/media/if-and-only-if.mp3`

Expected: HTTP 200 and an audio MIME type.

- [ ] **Step 3: Confirm the final branch state**

Run: `git status -sb`

Expected: clean `codex/audience-pixel-cctv` working tree.

Run: `git log -3 --oneline`

Expected: design, shader palette, and interface palette commits at the branch tip.

- [ ] **Step 4: Publish the fast-forward update and monitor Pages**

Run:

```bash
git fetch https://github.com/eeeepeul/eeeepeul.github.io.git main
git rev-list --left-right --count FETCH_HEAD...HEAD
```

Expected: remote-only count `0`; the local branch is a fast-forward update.

Push:

```bash
git push https://github.com/eeeepeul/eeeepeul.github.io.git codex/audience-pixel-cctv:main
```

Expected: `main` advances without force.

Monitor the `GitHub Pages` workflow for the pushed commit and require a completed `success` conclusion before reporting deployment complete.
