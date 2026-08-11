# Figma Home Pixel-Match Design

## Scope

Refine page 1 (`/`) to match the Figma `home` frame (`2710:286`) at the 1280×720 reference size. Only the page-1 sidebar visuals and lower-left home icon change. The centered CCTV navigation button, sidebar motion/state behavior, page 2, and page 3 remain unchanged.

## Sidebar

- Rebuild Figma node `2710:288` as native HTML/CSS UI, using SVG assets only for the original icons and marks.
- Preserve the Figma reference size of 319×664 at 1280×720.
- Preserve the reference placement: 28px from the top, right, and bottom.
- Keep the existing `ResponsiveSidebar` state machine, backdrop, open/close animation, accessibility labels, and keyboard behavior.
- Keep the close control as a real accessible button in the Figma toggle position.
- Render the intro, activity, distance, and network cards as separate semantic UI elements rather than a flattened screenshot.
- On narrower viewports, scale the native sidebar uniformly within the available panel while preserving its 319:664 aspect ratio.

## Lower-left icon

- Replace the existing rotated house mark with the exact exported `Union` asset from Figma node `2710:485`.
- Render it at 30×24px.
- At the 1280×720 reference size, place it 36px from the left and 36px from the bottom.
- Keep the existing link destination (`/second/`), accessible label, focus behavior, and click area.

## Verification

- Add assertions for the native Figma sidebar structure, exact geometry, card sizes, charts, and house asset.
- Confirm the centered `/experience/` link remains present.
- Confirm existing sidebar interaction tests continue to pass.
- Run the full test suite and production build.
- Compare the local 1280×720 view against the Figma screenshot when browser access allows it.

## Constraints

- No commit, push, or deployment.
- No changes to page 2 or page 3.
- No flattened full-sidebar image or duplicate visible sidebar UI.
