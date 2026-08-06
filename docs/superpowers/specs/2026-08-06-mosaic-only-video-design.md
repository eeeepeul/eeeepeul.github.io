# Mosaic-only video design

## Goal

Render all source-video information exclusively through the selected mosaic marks: `M·O·E`, circles, or squares. The space behind and between marks must remain a uniform palette background, so the source video never appears as a second translucent image.

## Rendering design

- Continue sampling the source video once per mosaic cell to determine luminance, mark choice, mark size, and the existing three palette roles.
- Preserve the current `M·O·E`, circle, and square modes, color combinations, scale, spacing, and Kick-driven glitch behavior.
- Set every non-mark pixel directly to `uBackgroundColor`.
- Remove source-video luminance and procedural grain from the background-color calculation.
- Do not add blur, opacity, or a second video layer.

## Data flow

1. The video frame is sampled at each cell center.
2. Sampled luminance selects the mark and its palette role.
3. The selected mark is drawn in the role color.
4. All remaining pixels are drawn in the unchanged background color.

## Verification

- Add a regression test proving the shader background no longer depends on video luminance or fine-grain noise.
- Keep the existing tests for all three mosaic modes, palette roles, shape proportions, and Kick behavior passing.
- Visually verify at a large mosaic scale that recognizable image detail exists only inside the marks and that the gaps remain one flat color.
- Run the full test suite and production build.

## Scope

This change affects only the mosaic canvas background composition. It does not change the source videos, audio, page layout, controls, sidebar motion, export codec, or deployment state.
