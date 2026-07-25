# Contained Stage Layout Design

## Context

The current page places the WebGL pixel video across the entire viewport and overlays both control surfaces above it. The revised layout must treat the color panel and the video area as separate floating rectangles. Pixel rendering must be visible only inside the right-hand video rectangle.

## Goals

- Give the left color panel approximately one quarter of the desktop viewport width.
- Place a separate 16:9 pixel video rectangle in the remaining area on the right.
- Clip the video and every pixel pattern to the 16:9 rectangle.
- Align the existing timeline, pixel-size control, Kick monitor, playback, and H.264 export directly below the video rectangle.
- Preserve the current four editable colors, Kick response, synchronized music, and 1920×1080 H.264 export.

## Desktop Layout

The page background remains `#EDECF1`. The two main surfaces appear as independent floating rectangles with outer margins and a visible gap; they do not form a full-height split-screen divider.

The left panel uses approximately 25% of the viewport width, with practical minimum and maximum widths so it remains usable on common desktop sizes. It extends nearly the full viewport height and keeps the existing four color controls.

The right workspace occupies the remaining width. Its first row is a centered 16:9 video stage. The second row is the control deck, aligned to the same left and right edges as the stage. The right workspace is sized so the stage and controls fit inside the viewport without scrolling on standard desktop screens.

## Video and Pixel Boundary

`visual-stage` is the only visible surface for the WebGL canvas. It keeps `aspect-ratio: 16 / 9` and `overflow: hidden`.

The canvas fills the stage but never the browser viewport. The video sample, four luminance patterns, palette changes, manual pixel size, and Kick-driven pixel size are all rendered inside this canvas. No pixel video or decorative pixel pattern appears outside the stage.

The source video keeps its original 16:9 framing, so it is not stretched or cropped by the interface layout.

## Control Placement

The lower control deck is no longer an overlay on top of the video. It sits in normal layout flow directly below the 16:9 stage. Its width exactly matches the stage width.

The color panel remains independent of the right workspace. Changing background, diagonal, circle, or solid-square colors updates the stage immediately and does not affect page background or control colors.

## Responsive Behavior

At narrow widths, the page becomes a vertical stack:

1. compact horizontal color palette
2. 16:9 pixel video stage
3. timeline, pixel-size control, Kick monitor, playback, and export controls

The 16:9 stage remains fully visible within the phone width. The page may scroll vertically on small screens instead of shrinking controls into an unusable size.

## Export Behavior

H.264 export continues to record only the WebGL canvas and synchronized music. The saved file remains 1920×1080 and never includes the left panel, page background, or lower controls.

## Error Handling

- Existing WebGL, playback, and H.264 support errors remain in the lower control deck.
- A rendering failure affects only the right stage and does not hide the color panel.
- Existing palette validation and fallback colors remain unchanged.

## Testing

- Verify the desktop shell provides an approximately 25% left panel and a separate right workspace.
- Verify `visual-stage` is 16:9, contained, and uses overflow clipping.
- Verify the canvas is no longer positioned across the full viewport.
- Verify the control deck follows the stage in layout flow and shares its width.
- Verify mobile layout stacks palette, stage, and controls.
- Run all existing palette, Kick, playback, H.264, static export, and media-route tests unchanged.

## Out of Scope

- Resizable or draggable panels
- User-controlled stage aspect ratios
- Pixel graphics outside the video stage
- Changing the 1920×1080 export size
