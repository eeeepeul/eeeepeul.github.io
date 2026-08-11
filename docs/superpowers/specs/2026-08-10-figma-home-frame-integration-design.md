# Figma Home Frame Integration Design

## Goal

Implement the Figma `home` frame (`2710:286`) from the `wireframe` section of the `웹개발` page in the existing local website's page 1.

## Preserved Behavior

- Keep the centered link that navigates to `/experience/`.
- Keep the current `ResponsiveSidebar` open, close, backdrop, keyboard, mobile, and responsive animations.
- Keep the sidebar's compact state and right-edge anchoring.
- Do not change pages 2 or 3.

## Visual Integration

- Replace the current coordinate-grid presentation on page 1 with the visual composition from the Figma `home` frame.
- Recreate the Figma design using the project's existing React and CSS structure rather than using a flattened screenshot.
- Keep the Figma frame's main visual content behind the centered navigation control.
- Recreate the Figma home frame's right-sidebar contents inside the existing `ResponsiveSidebar` content slot.
- Preserve the existing sidebar shell, header controls, brand assets, footer mark, responsive sizing, and transition behavior unless the Figma frame provides a directly corresponding visual value for the sidebar interior.

## Component Boundaries

- `MainLanding` remains the page-1 entry component.
- `LandingFrame` remains the shared shell that positions the playfield and sidebar.
- `ResponsiveSidebar` remains responsible only for sidebar state and interaction.
- A page-1 visual component will render the Figma home composition.
- A page-1 sidebar-content component will render the Figma sidebar UI without owning open/close state.

## Data and Interaction Flow

1. Page 1 renders `MainLanding`.
2. `MainLanding` supplies the Figma-derived visual component to `LandingFrame` as the playfield.
3. The centered `/experience/` link remains a separate interactive layer above the playfield.
4. Figma-derived sidebar controls are passed as children to `ResponsiveSidebar`.
5. `ResponsiveSidebar` continues to own open/close state, Escape handling, backdrop behavior, and mobile body-scroll locking.

## Responsive Behavior

- Match the 1280 × 720 Figma frame at the desktop reference size.
- Scale and reflow decorative content without changing the centered navigation target.
- Keep the sidebar at the existing approved fixed desktop width and mobile width.
- Avoid horizontal overflow at narrow viewports.

## Assets

- Use exact Figma-exported images and icons when the frame contains non-CSS artwork.
- Store lasting assets locally rather than depending on expiring Figma asset URLs.
- Reuse existing project assets when they are visually identical.

## Verification

- Add a failing page-1 rendering test before implementation.
- Confirm the centered `/experience/` link remains present.
- Confirm Figma-derived home content and sidebar content render on page 1.
- Confirm existing sidebar state tests continue to pass.
- Run the full test suite and production build.
- Visually verify page 1 at desktop and mobile widths in the local browser.

## Out of Scope

- Changes to page 2 or page 3.
- Changes to sidebar state-machine behavior.
- Git commit, push, or deployment.
