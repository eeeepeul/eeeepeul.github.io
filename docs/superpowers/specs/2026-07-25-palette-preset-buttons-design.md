# Palette Preset Buttons Design

## Goal

Replace the four independent color inputs in the left panel with four horizontal palette preset buttons. Selecting a button changes the full pixel-art color combination at once while preserving the existing video, Kick response, pixel-size drag control, and H.264 export.

## Interaction

- The left panel shows exactly four compact buttons in one horizontal row.
- Each button visually previews its complete combination with background, diagonal/solid, and circle colors.
- The active preset has a clear selected border and exposes `aria-pressed="true"`.
- Selecting a preset immediately sends its four color roles to the WebGL canvas.
- The first preset remains the approved sky-blue and red combination.

## Presets

1. Sky Red: `#EDECF1`, `#9AC2F0`, `#B70000`, `#9AC2F0`
2. Lime Violet: `#F2F0E8`, `#C9FF4A`, `#5A28C9`, `#C9FF4A`
3. Peach Cobalt: `#FFF1E6`, `#FF9F68`, `#1746D1`, `#FF9F68`
4. Mint Forest: `#E8F4EF`, `#7FD1AE`, `#173C2B`, `#7FD1AE`

Colors are listed in background, diagonal, circle, and solid order.

## Components and Data

- `pixel-palette.mjs` owns the immutable preset definitions and a helper that resolves a preset by ID with a safe default.
- `PixelExperience` owns the selected preset ID and palette state.
- `ColorPanel` renders the four buttons and emits a preset ID instead of editing one role at a time.
- `PixelCanvas` continues receiving the same four-role palette object, so rendering and recording code do not change.

## Responsive Layout

The four buttons remain on one row on desktop and mobile. They shrink within the available panel width without wrapping. The existing panel, stage, and controls layout remains unchanged.

## Verification

- Unit tests cover the four immutable preset definitions, default fallback, and selection behavior.
- Browser verification confirms four horizontal buttons, visible active state, and immediate canvas color changes.
- Existing playback, Kick, pixel-size, H.264, and static-export tests continue to pass.
