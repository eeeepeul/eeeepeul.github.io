# CCTV Sidebar Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CCTV page sidebar contents with the approved compact color-combination and pattern controls while preserving the existing experience and adding working M·O·E, Circle, and Square mosaic shapes.

**Architecture:** Keep `PixelExperience` as the state owner and the current WebGL playback pipeline. Extend normalized mosaic settings with a shape mode, pass one numeric uniform into the existing fragment shader, and simplify `ColorPanel`/`SettingsPanel` into the approved compact controls. Preserve the shared `ResponsiveSidebar` unchanged.

**Tech Stack:** Next.js 15, React 19, TypeScript, WebGL/GLSL, Node test runner, CSS.

## Global Constraints

- Preserve the approved sidebar motion, fixed width, `0 3px 30px rgba(0,0,0,0.05)` shadow, and compact state.
- Preserve random video playback, automatic kick response, manual pixel-size control, music playback, and H.264 export.
- The visible shape label is `M·O·E`; the existing luminance-to-letter rendering remains unchanged.
- The default shape is `M·O·E`.
- Scale and Spacing retain their existing ranges and rendering behavior.
- Do not show the large empty rectangle or the old advanced settings sections.
- Do not commit, push, or deploy unless the user explicitly requests it.

---

### Task 1: Add normalized mosaic shape modes

**Files:**
- Modify: `lib/mosaic-settings.mjs`
- Modify: `components/pixel-experience/SettingsPanel.tsx`
- Modify: `tests/mosaic-settings.test.mjs`

**Interfaces:**
- Produces: `MOSAIC_SHAPE_PRESETS` entries `{ id: 'moe' | 'circle' | 'square', label: string, shaderMode: 0 | 1 | 2 }`.
- Produces: `getMosaicShapePreset(id)` with an M·O·E fallback.
- Extends: `DEFAULT_MOSAIC_SETTINGS.shape` and `normalizeMosaicSettings(...).shape`.
- Extends: `MosaicSettings.shape` with `'moe' | 'circle' | 'square'`.

- [ ] **Step 1: Write failing tests**

Add literal expectations for preset order, visible labels, default `shape: 'moe'`, normalization of valid shapes, and fallback of an unknown shape to `moe`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/mosaic-settings.test.mjs`

Expected: FAIL because shape presets and normalized shape are missing.

- [ ] **Step 3: Implement the minimal shape data model**

Add:

```js
export const MOSAIC_SHAPE_PRESETS = Object.freeze([
  Object.freeze({ id: 'moe', label: 'M·O·E', shaderMode: 0 }),
  Object.freeze({ id: 'circle', label: 'Circle', shaderMode: 1 }),
  Object.freeze({ id: 'square', label: 'Square', shaderMode: 2 }),
])
```

Keep the existing E/O/M luminance mapping and character atlas behavior unchanged; this task changes the UI name/order, not the established brightness mapping.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/mosaic-settings.test.mjs`

Expected: PASS.

### Task 2: Render Circle and Square in the WebGL mosaic

**Files:**
- Modify: `lib/pixel-shaders.ts`
- Modify: `components/pixel-experience/PixelCanvas.tsx`
- Create: `tests/mosaic-shape-rendering.test.mjs`

**Interfaces:**
- Consumes: `MosaicSettings.shape` and `getMosaicShapePreset(shape).shaderMode`.
- Produces: GLSL uniform `uShapeMode` where `0=M·O·E`, `1=Circle`, `2=Square`.

- [ ] **Step 1: Write a failing shader wiring test**

Assert that `PixelCanvas` sends `uShapeMode`, the shader declares it, and Circle/Square paths use `uCircleColor` while the existing letter path remains present.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/mosaic-shape-rendering.test.mjs`

Expected: FAIL because `uShapeMode` does not exist.

- [ ] **Step 3: Implement one uniform and two geometric masks**

In GLSL, retain the existing atlas glyph for mode 0. For mode 1, use a centered circle mask inside `tileLocal`; for mode 2, use the existing `insideTile` mask as a filled square. Assign `uCircleColor` to both geometric modes and preserve spacing by multiplying masks by `insideTile`.

In `PixelCanvas`, import `getMosaicShapePreset` and set:

```ts
gl.uniform1f(
  gl.getUniformLocation(program, 'uShapeMode'),
  getMosaicShapePreset(current.settings.shape).shaderMode
)
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/mosaic-shape-rendering.test.mjs`

Expected: PASS.

### Task 3: Replace the sidebar contents with the approved controls

**Files:**
- Modify: `components/pixel-experience/ColorPanel.tsx`
- Modify: `components/pixel-experience/SettingsPanel.tsx`
- Modify: `app/globals.css`
- Create: `tests/cctv-sidebar-controls.test.mjs`

**Interfaces:**
- Consumes: existing palette presets and `MOSAIC_SHAPE_PRESETS`.
- Produces: four palette cards, Shape select, Scale slider, and Spacing slider only.

- [ ] **Step 1: Write a failing structure/style test**

Assert the approved lowercase headings, background-plus-main-color card variables, M·O·E/Circle/Square selector, compact Scale/Spacing rows, and absence of settings heading, reset controls, advanced adjustment sections, background editor, and placeholder rectangle.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/cctv-sidebar-controls.test.mjs`

Expected: FAIL because the old settings UI and E/O/M card preview remain.

- [ ] **Step 3: Simplify `ColorPanel`**

Render each card with:

```tsx
<span
  className="palette-preset-preview"
  style={{
    '--preset-background': preset.palette.background,
    '--preset-main': preset.palette.circle,
  } as CSSProperties}
>
  <i className="palette-main-swatch" />
</span>
<span className="palette-preset-name">SKY BLUE</span>
```

Keep the existing palette selection handlers and accessible pressed state.

- [ ] **Step 4: Simplify `SettingsPanel`**

Remove local background draft state, Reset, Character Set, Output Width, Adjustments, and Color sections from the rendered UI. Render `Shape`, `Scale`, and `Spacing`; bind Shape to `settings.shape`, keep Scale range `1..20`, and keep Spacing range `0..1` step `0.05`.

- [ ] **Step 5: Implement the approved CSS**

Style the panel headings in lowercase, four equal cards in a row, square palette preview with a centered circle, bordered labels, and rounded control rows. Use a custom CSS fill variable for each range while retaining a native transparent range input for pointer and keyboard behavior. Keep the shared sidebar container and motion selectors unchanged.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run: `node --test tests/cctv-sidebar-controls.test.mjs`

Expected: PASS.

### Task 4: Regression and visual verification

**Files:**
- Verify only; modify the relevant task file if a regression is discovered.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run type/build verification**

Run: `npm run build`

Expected: Next.js production build exits 0.

- [ ] **Step 3: Verify the local page**

Open `http://127.0.0.1:3004/experience/` and verify four palette cards, default M·O·E, Circle, Square, Scale, Spacing, desktop and narrow layouts, unchanged sidebar motion, and no empty rectangle.

- [ ] **Step 4: Check the worktree**

Run: `git diff --check`

Expected: no whitespace errors. Do not commit, push, or deploy.
