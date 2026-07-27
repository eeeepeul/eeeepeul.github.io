# M O E Letter Mosaic Design

## Goal

Replace the current background, diagonal, circle, and solid tile patterns with a full-screen letter mosaic inspired by the supplied reference image. Every video tile displays one letter. Source-video brightness determines the letter, while color can vary between tiles.

## Brightness Mapping

The sampled luminance of each video tile is classified into three bands:

- `M` for bright tiles: luminance at or above `0.66`
- `O` for middle tiles: luminance from `0.33` up to `0.66`
- `E` for dark tiles: luminance below `0.33`

There is no blank band. Every visible tile renders `M`, `O`, or `E`.

## Letter Rendering

The WebGL fragment shader draws compact 5-by-7 bitmap-style glyphs procedurally. The letters stay centered inside each tile and retain clear gaps between neighboring tiles. This avoids loading a font texture and keeps the 1920-by-1080 recording path deterministic.

The glyph orientation is fixed in screen space, while the source video continues to sample once at each tile center. Kick response still changes the number of tiles, so the same letters grow and shrink with the music.

## Color Behavior

Brightness chooses the letter, not one fixed output color:

- `E` starts from the preset's diagonal role color.
- `O` starts from the preset's circle role color.
- `M` starts from the preset's solid role color.
- The source tile luminance slightly modulates the selected role color, so two tiles with the same letter may have different brightness.
- The preset background color remains behind every glyph.

This preserves the four existing color-combination buttons while allowing variation like the reference image.

## Palette Preview

Each of the four palette buttons changes from the old pattern preview to a compact `E O M` preview. The preview uses the preset background and the three role colors, so it continues to communicate the complete combination before selection.

## Architecture

- A small `letter-mosaic.mjs` module owns the two thresholds and the pure luminance-to-letter classifier used by tests.
- `pixel-shaders.ts` imports the thresholds and implements the three glyph masks and per-tile color modulation.
- `ColorPanel.tsx` and its CSS render the new `E O M` preset previews.
- `PixelCanvas`, playback, Kick analysis, drag control, media synchronization, and H.264 recording interfaces remain unchanged.

## Failure Handling

The existing WebGL compilation and drawing error messages remain active. No new user input, network dependency, font file, or loading state is introduced.

## Verification

- Unit tests verify boundary mapping: dark to `E`, middle to `O`, bright to `M`, including exact thresholds and invalid input fallback.
- The full existing test suite and static production build must pass.
- Real-browser verification checks that every tile is a letter, brightness regions keep a consistent letter, the four color presets still change the image, Kick and pixel-size controls remain active, and mobile layout remains intact.
- The GitHub Pages deployment must serve the new letter mosaic and the existing H.264 media assets.
