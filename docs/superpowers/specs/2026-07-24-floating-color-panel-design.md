# Floating Color Panel Design

## Context

The current desktop layout reserves a separate grid column for an empty sidebar. The new layout must instead treat the pixel video as the full-screen visual surface and place controls above it as floating interface layers.

## Goals

- Fill the browser viewport with the live pixel video.
- Overlay an opaque white color panel along the left edge without reducing the video area.
- Let the visitor edit four visual roles independently: background, diagonal pattern, circle pattern, and solid square.
- Keep pixel size, playback, Kick monitoring, and H.264 export in a separate floating bar near the bottom.
- Preserve 1920×1080 H.264 output and automatic Kick response.

## Layout

The page uses a single full-viewport stage. The WebGL canvas sits at the lowest layer and fills the viewport. A fixed white palette panel sits above the canvas near the left edge with a narrow outer margin and a subtle border or shadow. It does not participate in page layout and therefore never pushes or resizes the canvas.

The existing timeline, pixel-size drag control, Kick monitor, playback button, and export button move into an opaque floating control bar near the bottom of the viewport. The bar remains visually separate from the color panel and does not change the exported video.

## Color Panel

The panel contains four controls in this order:

1. Background — default `#EDECF1`
2. Diagonal — default `#9AC2F0`
3. Circle — default `#B70000`
4. Solid square — default `#9AC2F0`

Each control shows a large swatch, a clear visual label, and its current hexadecimal value. Selecting a swatch opens the browser color picker. Changes update the pixel canvas immediately.

The four roles remain independent even though diagonal and solid square share the same initial blue.

## Rendering and Data Flow

`PixelExperience` owns the four color values. It passes them to a dedicated palette panel for editing and to `PixelCanvas` for rendering. `PixelCanvas` converts the selected hexadecimal colors to WebGL color uniforms and updates them without rebuilding the renderer.

The fragment shader keeps the existing four luminance bands and patterns. Only the color values become uniforms:

- darkest band: background
- dark-mid band: diagonal pattern
- light-mid band: circle pattern
- lightest band: solid square

Kick energy continues to change tile size only. It does not modify the selected colors.

## Responsive Behavior

On desktop, the palette is a vertical floating panel on the left and the control bar floats near the bottom.

On narrow phone screens, the color controls become a compact horizontal palette at the top. The lower control bar becomes narrower and may wrap its controls, while both overlays remain above the full-screen pixel video.

## Export Behavior

The interface overlays are never drawn into the WebGL canvas. H.264 export records only the 1920×1080 pixel video and synchronized music, using the visitor's current palette and pixel-size settings.

## Error Handling

- Invalid or unavailable color values fall back to the approved default for that visual role.
- Existing WebGL, playback, and export errors remain visible in the floating lower controls.
- If H.264 export is unsupported, the current support message remains available without blocking color editing.

## Testing

- Verify the page no longer reserves a sidebar grid column.
- Verify the palette and lower controls are overlay layers above a full-viewport canvas.
- Verify all four color controls update independent shader uniforms.
- Verify Kick changes tile size without changing colors.
- Verify mobile styles convert the left panel into a compact top palette.
- Run the existing playback, pixel, Kick, static export, and H.264 tests unchanged.

## Out of Scope

- Saving palettes to an account or server
- Synchronizing colors between visitors
- Including interface panels in exported video
- Adding extra pattern types
