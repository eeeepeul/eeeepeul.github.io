# Looping House Distance Design

## Goal

Turn the static distance card on page 1 into a draggable four-house route. The visible route always shows one straight segment from the current house to the next house, and continues in the order `house1 → house2 → house3 → house4 → house1`.

## Interaction

- Drag the straight distance bar to the left to advance one segment.
- Drag it to the right to return one segment.
- A drag must cross 28 pixels before it changes the segment; shorter movement snaps back.
- The previous and next arrow buttons perform the same movement without dragging.
- After `house4 → house1`, the next movement returns to `house1 → house2`, creating an infinite loop.

## Distance Data and Visual Mapping

- Four independent integer distances are generated once when the page loads.
- Each distance is between 8,000 and 18,000.
- The four values belong to `1→2`, `2→3`, `3→4`, and `4→1` respectively.
- The selected value is displayed above the route without a thousands separator to match the Figma reference.
- The straight route length is normalized between 68% and 100% of the card width so the random values are visually comparable without overflowing the 261-pixel viewport.
- Existing Figma tick and segment assets remain in use, scaled from the left edge. The second house label moves with the route endpoint.

## Components and State

- `lib/house-distance.mjs` owns wraparound, drag threshold, random-distance generation, and route-length normalization.
- `components/site/HouseDistanceCard.mjs` owns pointer state and renders the client interaction.
- `FigmaHomeSidebarContent.mjs` remains the composition layer and renders the new card.
- The client component begins with stable fallback distances for static rendering, then generates the random four-value set once after hydration.

## Accessibility and Error Handling

- Arrow controls are real buttons with Korean accessible labels.
- The route is exposed as a slider with `aria-valuemin="1"`, `aria-valuemax="4"`, and the current house number.
- Pointer cancellation resets the drag offset without changing houses.
- Invalid random values fall back to the lower distance bound.

## Verification

- Unit tests cover forward and backward wraparound, drag threshold behavior, four independently generated bounded distances, and normalized route length.
- Static markup tests cover the two arrow buttons, slider semantics, and the initial `house1 → house2` segment.
- Browser verification covers pointer dragging, arrow clicks, and the `house4 → house1 → house2` loop.

## Repository Constraint

The design and implementation remain uncommitted, unpushed, and undeployed until the user explicitly requests those Git operations.
