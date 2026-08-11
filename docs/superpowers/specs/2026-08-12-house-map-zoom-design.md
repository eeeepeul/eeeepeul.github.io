# House Map Zoom Design

## Goal

Replace the static network graphic below the distance control with an interactive, simplified map made only of house points, route lines, selection rings, labels, and the existing grid.

## Meaning

- A filled point is one of `house1` through `house4`.
- A line is the route between two adjacent houses and carries the same distance value shown by the distance control above it.
- A large hollow ring marks the currently selected departure house.
- A smaller hollow ring marks the currently selected destination house.
- Unselected houses have no ring, so rings communicate selection rather than an invented data metric.

## Interaction

- Changing the distance card from one house pair to another updates the highlighted line, both selection rings, and the emphasized distance label in the map.
- The map starts at `2%`, where the complete four-house route is visible.
- The minus and plus buttons move through `2%`, `10%`, `25%`, `50%`, `75%`, and `100%`.
- Zoom is centered on the midpoint of the selected house pair.
- The map stays clipped to the existing 287-by-180 card; no panning is introduced.

## Architecture

- Keep distance generation and route selection in `HouseDistanceCard`.
- Add an optional state callback so the distance card can report its current distances and selected house.
- Add a small client wrapper that renders `HouseDistanceCard` and the new map from one shared snapshot.
- Keep zoom math and route metadata in `lib/house-map.mjs` so the behavior is testable without a browser.

## Constraints

- Preserve the current sidebar dimensions and card order.
- Preserve the existing distance dragging, wheel, arrow, and keyboard interactions.
- Use native SVG and buttons, not a flattened image.
- Do not commit, push, or deploy.
