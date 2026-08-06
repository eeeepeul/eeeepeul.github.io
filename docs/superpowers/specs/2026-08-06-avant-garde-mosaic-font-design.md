# Avant Garde Mosaic Font Design

## Goal

Render the M·O·E mosaic glyphs with ITC Avant Garde Gothic Pro Bold while preserving the existing video, palette, Kick, circle, and square behavior.

## Design

- Use the locally activated `ITC Avant Garde Gothic Pro` family at weight 700 for the canvas glyph atlas.
- Keep the change limited to text-glyph atlas rendering; interface typography and geometric shape modes remain unchanged.
- Change each atlas cell from 42×64 to a square 64×64 cell so the geometric `M`, `O`, and `E` retain their intended proportions.
- Measure the widest glyph before drawing and reduce the requested font size only when necessary to preserve horizontal padding and prevent clipping.
- Fall back to `Avant Garde Gothic`, `Century Gothic`, Arial, and sans-serif when the licensed local font is unavailable.
- Do not copy or bundle the Adobe-managed font file. A future public deployment can attach an authorized Adobe Fonts web project if exact cross-device rendering is required.

## Verification

- Add a pure regression test for the glyph-fit calculation and verify it fails before implementation.
- Confirm the browser recognizes the ITC font locally.
- Visually inspect the M·O·E mode for the new geometric bold letterforms and confirm Circle and Square remain unchanged.
- Run the complete tests, production build, and local HTTP check.
