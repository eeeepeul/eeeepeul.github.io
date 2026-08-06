# Mosaic Detail Density Design

## Goal

Make the video silhouette more detailed while preserving the approved `scale 5` default and the existing M·O·E, circle, and square rendering modes.

## Design

- Increase the column density produced by the scale calculation by 25 percent.
- At the current initial drag position and `scale 5`, the clean image changes from about 100 columns to about 125 columns.
- Keep the scale control value, slider behavior, spacing, palette mapping, Kick response, and flat background behavior unchanged.
- Apply the same resolved column count to M·O·E, circle, and square modes through the shared grid path.

## Verification

- Add a focused regression assertion for the new default density.
- Confirm the test fails before changing production code and passes afterward.
- Visually inspect the initial M·O·E view and the circle and square alternatives.
- Run the full test suite, production build, and local HTTP check.
