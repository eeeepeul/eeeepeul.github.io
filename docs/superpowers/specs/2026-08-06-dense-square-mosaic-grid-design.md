# Dense Square Mosaic Grid Design

## Goal

Make the mosaic visibly denser at `scale 1` and `spacing 0.00` so the blue background no longer forms large gaps between rows of pixels, while preserving the natural ITC Avant Garde Gothic Pro Bold proportions.

## Design

- Calculate mosaic rows from the output aspect ratio without the current `0.62` reduction factor.
- At 1920×1080 and 500 columns, increase the grid from about 174 rows to 281 rows.
- Keep `spacing 0.00` as a true zero inset so adjacent pixel cells have no additional spacing.
- Return the glyph atlas to a square 64×64 cell because the physical mosaic cells will also be square.
- Increase the requested glyph size from 54 to 60 pixels and remove atlas padding at the zero-spacing baseline so each M·O·E glyph occupies more of its cell without changing its natural proportions.
- Keep the existing spacing-control range and its behavior for values above zero.
- Apply the denser square grid to M·O·E, Circle, and Square modes through their shared grid calculation.
- Do not add colored backing squares behind M·O·E glyphs and do not expose the source video behind the mosaic.

## Verification

- Add a regression test proving that 500 columns at 1920×1080 resolves to 281 rows and nearly square physical cells.
- Update the glyph-atlas regression test to prove that a square atlas maps into the square grid without width or height distortion.
- Add a regression assertion that the default glyph fit uses the larger zero-padding baseline.
- Visually inspect `scale 1` and `spacing 0.00` to confirm the blue row gaps are substantially reduced.
- Confirm M·O·E remains naturally proportioned and Circle and Square remain geometrically correct.
- Run the complete test suite, production build, and local HTTP check.
