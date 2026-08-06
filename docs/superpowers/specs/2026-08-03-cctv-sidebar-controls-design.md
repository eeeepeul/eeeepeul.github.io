# CCTV Sidebar Controls Design

## Scope

Redesign only the contents of the second, CCTV experience page sidebar. Preserve the approved sidebar container, open/close motion, drop shadow, video playlist, kick response, playback, and H.264 export behavior.

## Layout

- Keep the existing M:MH wordmark, menu toggle, rounded white panel, and footer mark.
- Place the controls in the vertical position and proportions shown in the approved reference.
- Render a lowercase `color combination` heading followed by four equal cards in one row.
- Each card shows exactly two palette roles: a square background swatch and one centered circular main-color swatch. The preview does not attempt to show every M, O, and E ink color.
- Render a lowercase `pattern` heading followed by the Shape, Scale, and Spacing controls.
- Remove the large empty rectangle and all other settings sections from the visible UI.

## Behavior

- Keep all four existing palette presets and their current rendering behavior.
- Use each preset's `background` color for the card square and its existing `circle` color as the representative main color inside the card circle.
- Add a Shape selector with `M·O·E`, `Circle`, and `Square` options.
- The default is `M·O·E`; visible naming uses M, then O, then E while the established luminance-to-letter mapping remains unchanged.
- `M·O·E` preserves distinct per-letter palette colors.
- `Circle` and `Square` render the sampled mosaic as geometric cells using the selected palette's existing `circle` color.
- Keep the current Scale and Spacing value ranges and rendering effects. Only their presentation changes to the approved filled-row slider UI.
- Keep hidden adjustment values at their existing defaults so removing their controls does not alter the current image unexpectedly.

## Components and Data Flow

- `PixelExperience` continues to own selected palette and mosaic settings.
- `ColorPanel` becomes the compact sidebar control composition.
- `SettingsPanel` exposes only Shape, Scale, and Spacing using the approved control treatment.
- Mosaic shape is normalized with the rest of the settings and passed through `PixelExperience` to `PixelCanvas`.
- `PixelCanvas` selects the existing M·O·E atlas path or a geometric Circle/Square path without changing playback or audio analysis.

## Responsive Behavior

- Preserve the current fixed desktop sidebar width and the approved compact mobile drawer behavior.
- Keep the four palette cards in one row; reduce gaps and text size at narrow widths without changing their order.
- Allow the panel content area to scroll only when viewport height requires it.

## Error Handling and Accessibility

- Unknown shape values normalize to `M·O·E`.
- Controls retain labels, keyboard operation, current values, and selected states.
- Existing playback, WebGL, and recording errors remain unchanged.

## Verification

- Unit tests cover shape normalization, the visible M/O/E naming, and palette main-color selection.
- Component tests cover the simplified sidebar structure and removal of the large empty/settings areas.
- Existing mosaic, playback, kick, export, responsive sidebar, and navigation tests remain green.
- Browser verification checks desktop and narrow layouts, all three shape selections, all palettes, and Scale/Spacing interaction.
