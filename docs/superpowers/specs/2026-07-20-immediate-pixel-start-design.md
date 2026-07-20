# Immediate Pixel Start Design

## Goal

Remove the full-screen `Start Experience` layer so the pixel CCTV artwork is visible as soon as the page opens.

## Approved behavior

- The muted CCTV video begins looping automatically when the page loads.
- The WebGL pixel canvas renders that video immediately.
- The existing control deck contains a small `음악 시작` button.
- Pressing `음악 시작` starts the attached track from the beginning and enables Kick-driven pixel sizing.
- After music starts, the button becomes the existing `처음부터` restart control.
- Manual pixel-size dragging and H.264 recording remain unchanged.
- While the muted preview is loading, the canvas keeps its approved `#EDECF1` fallback.

## Implementation boundaries

- Remove the start overlay markup and its unused styles.
- Use the video element's muted inline autoplay and loop behavior for the preview, and keep the pixel renderer active while it is visible.
- Keep audible playback in the existing user-triggered start path to comply with mobile browser autoplay restrictions.
- Do not change the media files, palette, resolution, Kick analysis, drag mapping, or export format.

## Verification

- A source-level test proves the full-screen start overlay is gone and the small music button is present.
- A source-level test proves the muted video preview is configured to autoplay and loop without starting the audio element.
- Existing palette, Kick, drag, synchronization, timeout, and H.264 tests continue to pass.
- The production build and static export succeed before local and public deployment checks.
