# House Map Bounds and Zoom Control Design

## Goal

Let users pan an enlarged map all the way to its real content edges, keep the zoom buttons inside their control at 100%, and change the overview level from 2% to 1%.

## Zoom Model

- Zoom levels are `1`, `10`, `25`, `50`, `75`, and `100` percent.
- The 1% overview uses scale `1` and remains centered with panning disabled.
- The 100% view uses scale `4`.
- Intermediate scales are interpolated between 1% and 100%.
- Distance labels retain their current eight-pixel visual size at every level.

## Pan Bounds

- Remove the fixed horizontal and vertical pan limits.
- Compute the live map content bounds from all four house centers and their current visit-ring radii.
- Include routes and labels implicitly because they remain inside the outer house-ring envelope.
- At enlarged levels, clamp each axis so the outermost ring stops exactly at the corresponding viewport edge.
- Do not allow dragging beyond the outer rings into empty map space.
- If the content is smaller than the viewport on an axis, center that axis and disable movement on it.
- Recompute the valid pan range when the selected house pair, zoom level, or live visit-ring sizes change.

## Zoom Control Layout

- Replace the narrow flex distribution with a fixed three-column grid: minus button, percentage label, plus button.
- Reserve enough width for the `100%` label and keep both buttons inside the background at all zoom levels.
- Preserve the control's bottom-right position and current visual styling.

## Interaction

- Existing mouse and touch dragging, five-pixel drag threshold, click suppression, and no-inertia release behavior remain unchanged.
- Changing zoom or the selected route recenters the map before applying the new content bounds.
- House links remain keyboard accessible and simple clicks continue to open the matching CCTV page.

## Testing

- Unit tests cover the 1% minimum, 1-to-100 scale interpolation, exact ring-derived pan bounds, asymmetric bounds, and centering when content is smaller than the viewport.
- Component tests confirm the initial 1% label and pan-disabled state.
- CSS tests confirm the zoom control reserves stable columns for both buttons and the 100% label.
- A production build and local browser test verify full-edge dragging and the contained plus button at 100%.

## Constraints

- Preserve all existing uncommitted work.
- Do not commit, push, or deploy unless the user explicitly asks.
