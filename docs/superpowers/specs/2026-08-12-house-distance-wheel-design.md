# House Distance Wheel Design

## Goal

Move the house-distance route horizontally while the pointer is over the distance card: scrolling down moves the route from right to left, and scrolling up moves it from left to right.

## Interaction

- Wheel movement updates the same free horizontal offset used by pointer dragging.
- The route does not snap after wheel input and remains at the last scrolled position.
- Crossing a complete 261-pixel route advances or reverses the current house while preserving the remaining fractional offset.
- The sequence continues through `house1 → house2 → house3 → house4 → house1` in both directions.
- Wheel input is consumed only over the distance track so the surrounding page does not move at the same time.

## State and Testing

- House index and free offset update atomically to avoid dropped high-frequency wheel events.
- A pure wheel-position function covers direction, remainder preservation, and the house4/house1 seam.
- Component and browser checks preserve the existing pointer drag, arrow, and keyboard behavior.

## Repository Constraint

Do not commit, push, or deploy until the user explicitly requests those actions.
