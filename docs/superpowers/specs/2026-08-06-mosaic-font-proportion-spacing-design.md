# Mosaic Font Proportion and Spacing Design

## Goal

Restore the natural width-to-height proportions of the ITC Avant Garde Gothic Pro Bold M·O·E glyphs and reduce the default visible gap between neighboring glyphs without changing the mosaic density, controls, palette, or non-text shape modes.

## Root Cause

The current glyph atlas uses square 64×64 cells, while the mosaic grid cells are physically taller than they are wide. Mapping a square atlas cell across a tall grid cell stretches each glyph vertically, making the font look horizontally compressed. The font file itself is not distorted.

## Design

- Keep the locally activated `ITC Avant Garde Gothic Pro` family at weight 700 and retain the existing fallback stack.
- Use a 64×104 glyph-atlas cell. Its width-to-height ratio closely matches the mosaic grid cell ratio, so mapping the atlas into the grid preserves the typeface's natural proportions.
- Reduce horizontal glyph padding from 6 pixels to 2 pixels. This lets each glyph occupy more of its tile and narrows the default visible gap between neighboring letters.
- Keep the requested font size, mosaic column count, scale value, spacing control, color mapping, Kick response, circle mode, and square mode unchanged.
- Continue reducing the font size only when a glyph would otherwise exceed the available atlas width.

## Verification

- Add a pure regression test showing that a square atlas compresses the displayed glyph width inside the current grid, while a 64×104 atlas preserves it within a small tolerance.
- Add a regression assertion for the narrower default atlas padding.
- Visually inspect the M·O·E view for natural Avant Garde proportions and tighter spacing.
- Confirm circle and square modes remain unchanged.
- Run the complete test suite, production build, and local HTTP check.
