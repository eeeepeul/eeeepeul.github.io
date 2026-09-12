# Fixed-focus island map design

## Goal

Replace the current abstract house-network map with a two-scale cartographic map. Scrolling over the map moves a fixed virtual camera between a whole-island view and a close cartographic view. The camera always follows the same route and is anchored on the black house cluster shown in the supplied reference.

## Scope

- The map begins at the supplied continent/island-style overview: pale grid, repeated glyph texture, and a visible island silhouette.
- The focus target is the black, four-building cluster in the northern-central part of the detailed reference. It represents the houses, not a freely selected location.
- Scroll or trackpad input while the pointer is over the map changes one continuous zoom value. Scrolling down zooms in; reverse scrolling zooms out.
- The overview morphs into the detailed monochrome cartographic layer: coordinate labels, scale axis, contour-like lines, currents/arrows, road lines, terrain textures, and the house cluster.
- The camera position is computed from one fixed focus coordinate. It does not follow the cursor, has no panning, and never exposes an alternate map area.
- Existing plus/minus controls adjust the same fixed zoom model. Drag-to-pan is removed.
- At detailed zoom, each black building remains a clickable house target and keeps its existing CCTV navigation URL. Existing visit counts continue to control the surrounding activity ring.
- Distance labels retain constant on-screen size as the map zooms.

## Visual layers

1. **Overview layer (0–30%)** — grey character/glyph island silhouette on a subtle square grid, with the target island centered in the card.
2. **Transition layer (30–65%)** — overview fades while the detailed terrain, directional marks, and scale grid fade in. The black house cluster becomes prominent before the map reaches full detail.
3. **Detail layer (65–100%)** — image-1-inspired monochrome terrain map, with the house cluster in the fixed center focus and the four individual house links accessible.

The map is code-drawn SVG/CSS rather than a screenshot: it remains crisp at every zoom level and gives each house a semantic, clickable target.

## Interaction and accessibility

- Wheel input is captured only while the pointer is inside the map and prevents page scrolling only when the zoom value can change in that direction.
- Keyboard users can use the existing zoom buttons; their `aria-label`, disabled state, and percentage announcement remain current.
- The SVG remains labelled as a house map. Building links expose their house name and recent visit count.
- Reduced-motion users receive an immediate but equivalent zoom-level update instead of a long visual transition.

## Data flow

- `HouseMapCard` owns the continuous zoom state and converts wheel deltas into bounded zoom increments.
- `house-map.mjs` exports fixed-focus view calculations and discrete control steps, removing selected-route centering and pan bounds from the render path.
- The existing shared visitor-count source is unchanged; it is fed into the building rings exactly as today.

## Verification

- Unit tests prove zoom remains within 1–100%, wheel deltas change it in the expected direction, and the view transform always uses the supplied fixed focus point.
- Component tests confirm drag/pan attributes are absent, wheel input is registered, and all four CCTV house links survive the new visual layers.
- A production build verifies the static export still works.
