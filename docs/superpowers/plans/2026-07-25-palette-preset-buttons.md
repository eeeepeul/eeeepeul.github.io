# Palette Preset Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace four independent color inputs with four horizontal buttons that swap the full pixel palette.

**Architecture:** Immutable preset definitions and ID resolution live in `pixel-palette.mjs`. `PixelExperience` stores only the active preset ID, `ColorPanel` emits IDs, and the existing four-role palette contract into `PixelCanvas` remains unchanged.

**Tech Stack:** Next.js 15, React, TypeScript, WebGL, Node test runner, CSS

## Global Constraints

- Show exactly four preset buttons in one horizontal row.
- Keep Sky Red as the default preset.
- Selecting a button immediately updates all four palette roles.
- Preserve the 1920×1080 H.264 export, playback, Kick response, and pixel-size control.
- Do not add dependencies.

---

### Task 1: Palette Preset Model

**Files:**
- Modify: `lib/pixel-palette.mjs`
- Modify: `tests/pixel-palette-controls.test.mjs`

**Interfaces:**
- Produces: `PIXEL_PALETTE_PRESETS`, `DEFAULT_PIXEL_PALETTE_ID`, and `getPixelPalettePreset(id)`
- Preserves: `DEFAULT_PIXEL_PALETTE`, `normalizeHexColor(value, fallback)`, and `hexToUnitRgb(value, fallback)`

- [ ] **Step 1: Write the failing preset-resolution tests**

```js
test('resolves each palette button to its full color combination', () => {
  assert.equal(PIXEL_PALETTE_PRESETS.length, 4)
  assert.deepEqual(getPixelPalettePreset('peach-cobalt'), {
    background: '#FFF1E6',
    diagonal: '#FF9F68',
    circle: '#1746D1',
    solid: '#FF9F68',
  })
})

test('falls back to the original sky-red palette for an unknown preset', () => {
  assert.deepEqual(getPixelPalettePreset('unknown'), DEFAULT_PIXEL_PALETTE)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/pixel-palette-controls.test.mjs`

Expected: FAIL because `PIXEL_PALETTE_PRESETS` and `getPixelPalettePreset` are not exported.

- [ ] **Step 3: Add the four immutable preset definitions and resolver**

```js
export const PIXEL_PALETTE_PRESETS = Object.freeze([
  Object.freeze({ id: 'sky-red', label: '하늘과 빨강', palette: Object.freeze({
    background: '#EDECF1', diagonal: '#9AC2F0', circle: '#B70000', solid: '#9AC2F0',
  }) }),
  Object.freeze({ id: 'lime-violet', label: '라임과 보라', palette: Object.freeze({
    background: '#F2F0E8', diagonal: '#C9FF4A', circle: '#5A28C9', solid: '#C9FF4A',
  }) }),
  Object.freeze({ id: 'peach-cobalt', label: '살구와 파랑', palette: Object.freeze({
    background: '#FFF1E6', diagonal: '#FF9F68', circle: '#1746D1', solid: '#FF9F68',
  }) }),
  Object.freeze({ id: 'mint-forest', label: '민트와 짙은 초록', palette: Object.freeze({
    background: '#E8F4EF', diagonal: '#7FD1AE', circle: '#173C2B', solid: '#7FD1AE',
  }) }),
])

export const DEFAULT_PIXEL_PALETTE_ID = PIXEL_PALETTE_PRESETS[0].id
export const DEFAULT_PIXEL_PALETTE = PIXEL_PALETTE_PRESETS[0].palette

export function getPixelPalettePreset(id) {
  return PIXEL_PALETTE_PRESETS.find((preset) => preset.id === id)?.palette
    ?? DEFAULT_PIXEL_PALETTE
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/pixel-palette-controls.test.mjs`

Expected: all focused tests pass.

### Task 2: Horizontal Preset Buttons

**Files:**
- Modify: `components/pixel-experience/ColorPanel.tsx`
- Modify: `components/pixel-experience/PixelExperience.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `PIXEL_PALETTE_PRESETS`, `DEFAULT_PIXEL_PALETTE_ID`, and `getPixelPalettePreset(id)`
- `ColorPanel` props become `{ selectedId, onSelect }`
- `PixelCanvas` continues receiving `{ background, diagonal, circle, solid }`

- [ ] **Step 1: Replace the individual inputs with four real buttons**

```tsx
<div className="palette-presets">
  {PIXEL_PALETTE_PRESETS.map((preset) => (
    <button
      key={preset.id}
      type="button"
      className="palette-preset"
      aria-label={`${preset.label} 색 조합`}
      aria-pressed={selectedId === preset.id}
      onClick={() => onSelect(preset.id)}
    >
      <span
        className="palette-preset-preview"
        style={{
          '--preset-background': preset.palette.background,
          '--preset-diagonal': preset.palette.diagonal,
          '--preset-circle': preset.palette.circle,
          '--preset-solid': preset.palette.solid,
        } as CSSProperties}
      >
        <i className="preset-tile preset-tile--background" />
        <i className="preset-tile preset-tile--diagonal" />
        <i className="preset-tile preset-tile--circle" />
        <i className="preset-tile preset-tile--solid" />
      </span>
    </button>
  ))}
</div>
```

- [ ] **Step 2: Store the active preset ID and resolve its full palette**

```tsx
const [paletteId, setPaletteId] = useState(DEFAULT_PIXEL_PALETTE_ID)
const palette = useMemo(() => getPixelPalettePreset(paletteId), [paletteId])
```

Pass `palette` to `PixelCanvas`, and pass `paletteId` plus `setPaletteId` to `ColorPanel`.

- [ ] **Step 3: Style one four-button row with clear active feedback**

```css
.palette-presets {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.palette-preset {
  min-width: 0;
  aspect-ratio: 1;
}

.palette-preset[aria-pressed="true"] {
  border-color: #17161b;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #17161b;
}
```

- [ ] **Step 4: Run the complete test and production build**

Run: `npm test && npm run build && npm run verify:static`

Expected: all tests pass, the Next.js production build succeeds, and the static export verifies.

- [ ] **Step 5: Verify in the real browser**

At desktop and mobile widths:

- exactly four buttons appear in one horizontal row;
- the first button starts active;
- clicking each of the other buttons changes `aria-pressed` and visibly changes the canvas colors;
- the video, Kick response, controls, and 16:9 stage remain contained.

- [ ] **Step 6: Commit**

```bash
git add lib/pixel-palette.mjs tests/pixel-palette-controls.test.mjs \
  components/pixel-experience/ColorPanel.tsx \
  components/pixel-experience/PixelExperience.tsx app/globals.css
git commit -m "feat: add pixel palette preset buttons"
```
