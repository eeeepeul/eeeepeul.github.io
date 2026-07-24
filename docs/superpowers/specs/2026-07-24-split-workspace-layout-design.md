# Split Workspace Layout Design

## Goal

Reshape the Pixel CCTV page to match the supplied desktop-tool reference: an empty white panel on the left and a large graphic workspace on the right, with no title bar or header copy.

## Approved layout

- Remove the entire current header, including `IF AND ONLY IF / 02`, `PIXEL CCTV`, the subtitle, and the `LOCAL/LIVE` label.
- Remove the `CAM 01`, `4 BAND PATTERN`, column, and Kick text overlays from the artwork so the right side shows only the graphic.
- Add a blank white left panel with no text, buttons, controls, or decoration beyond a subtle right divider.
- Use a responsive desktop width for the blank panel: approximately 22% of the viewport, constrained to a practical minimum and maximum.
- Place the 16:9 pixel graphic prominently in the right workspace and center it horizontally.
- Keep the timeline, pixel-size drag control, Kick meter, music button, and H.264 export below the graphic within the right workspace.
- Remove the current footer copy so the interface contains only the artwork and functional controls.
- Preserve the existing `#EDECF1`, `#B70000`, and `#9AC2F0` palette, video, music, Kick response, drag behavior, and 1920×1080 H.264 export.

## Responsive behavior

- On desktop and tablet landscape widths, show the two-column layout with the blank white panel visible.
- On narrow mobile widths, hide the empty panel and let the artwork and controls use the full viewport width.
- Keep touch and keyboard behavior for the pixel-size slider unchanged.

## Structure

- `PixelExperience` renders one outer two-column shell.
- An empty `aside` is marked `aria-hidden="true"` because it is purely visual.
- A right-hand workspace contains the current graphic stage and control deck.
- Existing media elements and playback/recording state remain inside the workspace without behavioral changes.

## Verification

- A layout test proves the header and footer copy are absent.
- The same test proves a blank left panel and right workspace exist.
- CSS tests prove the two-column desktop layout and single-column mobile fallback.
- Existing immediate preview, palette, Kick, drag, playback, and H.264 tests continue to pass.
- The static production build succeeds before local and public deployment checks.
