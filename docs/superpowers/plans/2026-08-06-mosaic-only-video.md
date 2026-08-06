# Mosaic-only Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the translucent source-video image from the canvas background so video information is visible only through `M·O·E`, circle, or square mosaic marks.

**Architecture:** Keep the existing per-cell video sampling and mark-selection pipeline unchanged. Change only the final fragment composition so non-mark pixels use `uBackgroundColor` directly instead of a video-luminance and noise-adjusted paper color.

**Tech Stack:** Next.js 15, React, TypeScript, WebGL GLSL, Node test runner

## Global Constraints

- Preserve the existing `M·O·E`, circle, and square modes.
- Preserve palette switching, scale, spacing, Kick response, H.264 export, and page layout.
- Non-mark pixels must equal `uBackgroundColor` and must not depend on the source frame or procedural noise.
- Do not add dependencies.
- Do not commit, push, or deploy unless the user explicitly requests it.

---

### Task 1: Compose the source video only through mosaic marks

**Files:**
- Modify: `tests/mosaic-shape-rendering.test.mjs`
- Modify: `lib/pixel-shaders.ts`

**Interfaces:**
- Consumes: the existing GLSL values `uBackgroundColor`, `roleColor`, and `glyph`
- Produces: final canvas color `mix(uBackgroundColor, roleColor, glyph)`

- [ ] **Step 1: Write the failing regression test**

Add this test to `tests/mosaic-shape-rendering.test.mjs`:

```js
test('shows source-video information only inside mosaic marks', () => {
  assert.match(shader, /vec3 outputColor = mix\(uBackgroundColor, roleColor, glyph\);/)
  assert.doesNotMatch(shader, /float paperLuma = luminance\(texture2D\(uVideo, shiftedUv\)\.rgb\);/)
  assert.doesNotMatch(shader, /float fineGrain =/)
  assert.doesNotMatch(shader, /vec3 paperColor =/)
})
```

- [ ] **Step 2: Run the focused test and verify the intended failure**

Run:

```bash
node --test tests/mosaic-shape-rendering.test.mjs
```

Expected: the new test fails because the shader still calculates `paperLuma`, `fineGrain`, and `paperColor`, then mixes `paperColor` behind the marks.

- [ ] **Step 3: Replace the background composition with the palette background**

In `lib/pixel-shaders.ts`, replace:

```glsl
float paperLuma = luminance(texture2D(uVideo, shiftedUv).rgb);
float fineGrain = (noise(gl_FragCoord.xy + vec2(timeStep, timeStep * 0.37)) - 0.5) * 0.035;
vec3 paperColor = clamp(uBackgroundColor + vec3((paperLuma - 0.5) * 0.18 + fineGrain), 0.0, 1.0);
vec3 outputColor = mix(paperColor, roleColor, glyph);
```

with:

```glsl
vec3 outputColor = mix(uBackgroundColor, roleColor, glyph);
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
node --test tests/mosaic-shape-rendering.test.mjs
```

Expected: all tests in the file pass with zero failures.

- [ ] **Step 5: Verify all modes visually**

Open `http://127.0.0.1:3004/experience/`, set a large mosaic size, and inspect `M·O·E`, `Circle`, and `Square`. Expected: the source image is readable only through the colored marks; every gap remains one uniform palette background color.

- [ ] **Step 6: Run complete verification**

Run:

```bash
npm test
git diff --check
npm run build
```

Expected: 80 or more tests pass, `git diff --check` prints no errors, and the production build exits successfully.

- [ ] **Step 7: Restore the local development server without publishing**

Run:

```bash
npm run dev -- --port 3004
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3004/experience/
```

Expected: the server reports ready and the page returns HTTP 200. Do not commit, push, or deploy.
