// The pointer over the drawing board: a paintbrush whose tip is the colour that is chosen (or an eraser when the eraser
// is chosen), with the hot spot at the very tip of the bristles, so what is drawn is where the tip is.
// Returns the value of a css `cursor`: the picture (an SVG as a data URL), its hot spot, and a fallback.
export const BRUSH_HOT_SPOT = { x: 4, y: 28 }

const SIZE = 32

const brushSvg = (colour) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
  // the handle, the metal band, the bristles with their tip at the hot spot
  `<path d="M27.5 4.5 L14 18" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" fill="none"/>` +
  `<path d="M27.5 4.5 L14 18" stroke="#5e4a42" stroke-width="4" stroke-linecap="round" fill="none"/>` +
  `<path d="M14.8 17.2 L10.6 21.4" stroke="#ffffff" stroke-width="7.5" stroke-linecap="round" fill="none"/>` +
  `<path d="M14.8 17.2 L10.6 21.4" stroke="#b9b9b9" stroke-width="5" stroke-linecap="round" fill="none"/>` +
  `<path d="M10.6 19.4 L13 21.8 C11.5 25 8.5 28 4 28.2 C4 23.6 7 20.6 10.6 19.4 Z" fill="${colour}" stroke="#111111" stroke-width="1.2" stroke-linejoin="round"/>` +
  `</svg>`

const eraserSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
  `<path d="M4 28 L4 21 L13 12 L22 21 L15 28 Z" fill="#f4b6bd" stroke="#111111" stroke-width="1.2" stroke-linejoin="round"/>` +
  `<path d="M4 21 L13 12 L17.5 16.5 L8.5 25.5 Z" fill="#ffffff" stroke="#111111" stroke-width="1.2" stroke-linejoin="round"/>` +
  `</svg>`

export function brushCursor(colour = '#1c1c1c', { eraser = false } = {}) {
  const safe = /^#[0-9a-fA-F]{3,8}$/.test(colour) ? colour : '#1c1c1c'
  const svg = eraser ? eraserSvg : brushSvg(safe)
  const { x, y } = BRUSH_HOT_SPOT
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, crosshair`
}
