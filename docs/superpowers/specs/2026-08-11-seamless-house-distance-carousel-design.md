# Seamless House Distance Carousel Design

## Goal

Make the page-one distance route fill the complete 261-pixel card width and move as one continuous line while the user drags between house pairs.

## Interaction

- The visible route always spans the full card width.
- Previous, current, and next routes sit side by side in one horizontal strip.
- Pointer movement translates that strip directly with no easing while dragging.
- Releasing beyond the existing 28-pixel threshold animates exactly one full slide, updates the current house, and recenters the strip without a visible jump.
- Releasing below the threshold smoothly returns the current route to center.
- Arrow buttons and keyboard arrows use the same slide animation.
- The loop remains `house1 → house2 → house3 → house4 → house1` in both directions.

## Rendering

- Each slide is exactly 261 pixels wide.
- Existing Figma tick and solid-segment SVG assets remain unchanged and already total 261 pixels.
- Route scaling is removed because it caused the unfilled right edge.
- The distance number stays centered over each route; the start and end house labels stay anchored to the two ends.

## State

- The pure distance model provides the previous/current/next house indexes for any current index.
- The client component separates live pointer offset from slide animation direction.
- Transition completion advances the canonical house index and resets the strip to its centered position with transitions temporarily disabled.
- A transition lock prevents overlapping arrow, keyboard, or pointer releases.

## Verification

- Unit tests cover the wrapped three-house window at the first and fourth house.
- Static markup tests confirm three neighboring slides are rendered.
- CSS tests confirm the 783-pixel strip, centered starting position, full-width routes, and drag-following transition behavior.
- Browser verification checks forward and reverse looping without a blank right edge.

## Repository Constraint

Do not commit, push, or deploy until the user explicitly requests those actions.
