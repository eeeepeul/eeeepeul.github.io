# M O E Letter Mosaic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every video tile as `M`, `O`, or `E`, chosen by source luminance, with per-tile color brightness variation.

**Architecture:** A pure module owns the two brightness thresholds and classification behavior. The WebGL shader uses the same thresholds to draw procedural 5-by-7 glyph masks, while the existing palette roles supply glyph hues and the source luminance modulates their intensity. Palette buttons preview `E O M` instead of the removed geometric patterns.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL 1, GLSL ES 1.00, Node test runner, CSS

## Global Constraints

- Every tile must display exactly one of `M`, `O`, or `E`; no blank luminance band.
- Map luminance below `0.33` to `E`, from `0.33` up to `0.66` to `O`, and at or above `0.66` to `M`.
- Tiles with the same letter may vary in color intensity according to source luminance.
- Preserve all four palette buttons, Kick response, manual pixel sizing, media synchronization, and 1920-by-1080 H.264 export.
- Add no font file, image atlas, dependency, or network request.

---

### Task 1: Luminance-to-Letter Contract

**Files:**
- Create: `lib/letter-mosaic.mjs`
- Create: `tests/letter-mosaic.test.mjs`
- Delete: `tests/pixel-palette.test.mjs`

**Interfaces:**
- Produces: `LETTER_THRESHOLDS` as frozen `[0.33, 0.66]`
- Produces: `letterForLuminance(value)` returning `'E' | 'O' | 'M'`
- Invalid and non-finite values fall back to the darkest `E` band.

- [ ] **Step 1: Write the failing behavior tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { letterForLuminance } from '../lib/letter-mosaic.mjs'

test('maps every luminance to E, O, or M without a blank band', () => {
  assert.deepEqual(
    [0, 0.329, 0.33, 0.659, 0.66, 1].map(letterForLuminance),
    ['E', 'E', 'O', 'O', 'M', 'M']
  )
})

test('falls back to E when luminance is invalid', () => {
  assert.equal(letterForLuminance(Number.NaN), 'E')
  assert.equal(letterForLuminance(undefined), 'E')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/letter-mosaic.test.mjs`

Expected: FAIL because `lib/letter-mosaic.mjs` does not exist.

- [ ] **Step 3: Implement the minimal classifier**

```js
export const LETTER_THRESHOLDS = Object.freeze([0.33, 0.66])

export function letterForLuminance(value) {
  if (!Number.isFinite(value)) return 'E'
  if (value < LETTER_THRESHOLDS[0]) return 'E'
  if (value < LETTER_THRESHOLDS[1]) return 'O'
  return 'M'
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/letter-mosaic.test.mjs`

Expected: both tests pass.

- [ ] **Step 5: Remove source-text shader tests**

Delete `tests/pixel-palette.test.mjs`. Its assertions grep implementation text rather than exercising output; the new classifier tests and real-browser render verification replace it.

### Task 2: Procedural M O E Shader and Palette Preview

**Files:**
- Modify: `lib/pixel-shaders.ts`
- Modify: `components/pixel-experience/ColorPanel.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `LETTER_THRESHOLDS` from `lib/letter-mosaic.mjs`
- Preserves: all existing shader uniforms and `PixelCanvas` props
- `E` uses `uDiagonalColor`, `O` uses `uCircleColor`, and `M` uses `uSolidColor`

- [ ] **Step 1: Import and embed the shared thresholds**

```ts
import { LETTER_THRESHOLDS } from './letter-mosaic.mjs'

const DARK_TO_MIDDLE = LETTER_THRESHOLDS[0].toFixed(2)
const MIDDLE_TO_BRIGHT = LETTER_THRESHOLDS[1].toFixed(2)
```

Use `${DARK_TO_MIDDLE}` and `${MIDDLE_TO_BRIGHT}` inside the GLSL template so browser rendering and the tested classifier cannot drift.

- [ ] **Step 2: Replace geometric masks with 5-by-7 glyph masks**

```glsl
float equalCell(float value, float target) {
  return 1.0 - step(0.25, abs(value - target));
}

vec3 glyphCell(vec2 local) {
  vec2 glyphUv = (local - vec2(0.16, 0.12)) / vec2(0.68, 0.76);
  float inside = step(0.0, glyphUv.x) * step(glyphUv.x, 1.0)
    * step(0.0, glyphUv.y) * step(glyphUv.y, 1.0);
  float column = floor(clamp(glyphUv.x, 0.0, 0.999) * 5.0);
  float row = floor(clamp(1.0 - glyphUv.y, 0.0, 0.999) * 7.0);
  return vec3(column, row, inside);
}

float letterM(vec2 local) {
  vec3 cell = glyphCell(local);
  float verticals = max(equalCell(cell.x, 0.0), equalCell(cell.x, 4.0));
  float upperPair = equalCell(cell.y, 1.0)
    * max(equalCell(cell.x, 1.0), equalCell(cell.x, 3.0));
  float center = equalCell(cell.y, 2.0) * equalCell(cell.x, 2.0);
  return cell.z * max(verticals, max(upperPair, center));
}

float letterO(vec2 local) {
  vec3 cell = glyphCell(local);
  float horizontal = max(equalCell(cell.y, 0.0), equalCell(cell.y, 6.0))
    * step(0.75, cell.x) * step(cell.x, 3.25);
  float vertical = max(equalCell(cell.x, 0.0), equalCell(cell.x, 4.0))
    * step(0.75, cell.y) * step(cell.y, 5.25);
  return cell.z * max(horizontal, vertical);
}

float letterE(vec2 local) {
  vec3 cell = glyphCell(local);
  float vertical = equalCell(cell.x, 0.0);
  float topBottom = max(equalCell(cell.y, 0.0), equalCell(cell.y, 6.0));
  float middle = equalCell(cell.y, 3.0) * step(cell.x, 3.25);
  return cell.z * max(vertical, max(topBottom, middle));
}
```

- [ ] **Step 3: Select letters by brightness and vary color intensity per tile**

```glsl
vec3 sampledColor = texture2D(uVideo, sampleUv).rgb;
float luma = luminance(sampledColor);
float glyph = letterE(local);
vec3 roleColor = uDiagonalColor;

if (luma >= ${DARK_TO_MIDDLE}) {
  glyph = letterO(local);
  roleColor = uCircleColor;
}
if (luma >= ${MIDDLE_TO_BRIGHT}) {
  glyph = letterM(local);
  roleColor = uSolidColor;
}

float colorVariation = 0.76 + luma * 0.32;
vec3 glyphColor = clamp(roleColor * colorVariation, 0.0, 1.0);
vec3 outputColor = mix(uBackgroundColor, glyphColor, glyph);
gl_FragColor = vec4(outputColor, 1.0);
```

- [ ] **Step 4: Change each palette preview to E O M**

```tsx
<span
  className="palette-preset-preview"
  aria-hidden="true"
  style={{
    '--preset-background': preset.palette.background,
    '--preset-diagonal': preset.palette.diagonal,
    '--preset-circle': preset.palette.circle,
    '--preset-solid': preset.palette.solid,
  } as CSSProperties}
>
  <i className="preset-letter preset-letter--e">E</i>
  <i className="preset-letter preset-letter--o">O</i>
  <i className="preset-letter preset-letter--m">M</i>
</span>
```

```css
.palette-preset-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  place-items: center;
  background: var(--preset-background);
}

.preset-letter {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: clamp(10px, 1.1vw, 18px);
  font-style: normal;
  font-weight: 800;
}

.preset-letter--e { color: var(--preset-diagonal); }
.preset-letter--o { color: var(--preset-circle); }
.preset-letter--m { color: var(--preset-solid); }
```

Remove the obsolete pattern-tile CSS and keep the four preset buttons in one row.

- [ ] **Step 5: Run full automated verification**

Run: `npm test`

Expected: all tests pass with no failures.

Run: `npm run build`

Expected: the Next.js production build and static export succeed.

Run: `npm run verify:static`

Expected: `Static export verified`.

- [ ] **Step 6: Verify in the real browser**

At desktop and mobile widths, confirm:

- every rendered tile is visibly `M`, `O`, or `E`;
- bright image regions use `M`, middle regions use `O`, and dark regions use `E`;
- repeated letters show small intensity differences;
- all four palette buttons show `E O M`, remain horizontal, and still change the canvas;
- Kick, manual pixel size, 16:9 containment, and controls remain operational.

- [ ] **Step 7: Commit**

```bash
git add lib/letter-mosaic.mjs tests/letter-mosaic.test.mjs \
  lib/pixel-shaders.ts components/pixel-experience/ColorPanel.tsx app/globals.css
git rm tests/pixel-palette.test.mjs
git commit -m "feat: render M O E letter mosaic"
```
