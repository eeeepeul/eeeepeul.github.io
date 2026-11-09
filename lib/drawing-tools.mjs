// The small tools of the drawing pad (box 4-1), kept apart from the component so they can be tested:
// the brush sizes (the + and - keys), the undo / redo history (the < and > keys) and the colour field's hex text.

// Sizes of the brush in squares of the board; + goes up one, - goes down one.
export const BRUSH_SIZES = [1, 2, 3, 4, 6, 8]
export const DEFAULT_BRUSH = 0

export function stepBrush(index, direction) {
  const next = (Number.isInteger(index) ? index : DEFAULT_BRUSH) + (direction > 0 ? 1 : -1)
  return Math.min(BRUSH_SIZES.length - 1, Math.max(0, next))
}

// Undo and redo. `record` is called with the picture as it was before a change; `undo` / `redo` take the picture as it
// is now and give back the one to go to (or null when there is nothing to go to).
export function createHistory(limit = 40) {
  let past = []
  let future = []
  return {
    record(snapshot) {
      past.push(snapshot)
      if (past.length > limit) past.shift()
      future = []
    },
    undo(current) {
      if (!past.length) return null
      future.push(current)
      return past.pop()
    },
    redo(current) {
      if (!future.length) return null
      past.push(current)
      return future.pop()
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  }
}

// "D9D9D9" or "#d9d9d9" or "fa0" -> "#d9d9d9"; null when it is not a colour.
export function parseHex(text) {
  const value = String(text ?? '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value
      .split('')
      .map((digit) => digit + digit)
      .join('')
      .toLowerCase()}`
  }
  return /^[0-9a-fA-F]{6}$/.test(value) ? `#${value.toLowerCase()}` : null
}

export const hexText = (colour) => String(colour).replace(/^#/, '').toUpperCase()

// The colour chooser opened by the swatch: a hue bar and a brightness bar. They work in hue (0-360), saturation (0-100)
// and lightness (0-100); the colour itself is a hex text.
export function hexToHsl(hex) {
  const colour = parseHex(hex) ?? '#000000'
  const r = parseInt(colour.slice(1, 3), 16) / 255
  const g = parseInt(colour.slice(3, 5), 16) / 255
  const b = parseInt(colour.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: Math.round(((h * 60) + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToHex({ h = 0, s = 0, l = 0 } = {}) {
  const hue = ((Number(h) % 360) + 360) % 360
  const sat = Math.min(100, Math.max(0, Number(s))) / 100
  const light = Math.min(100, Math.max(0, Number(l))) / 100
  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - chroma / 2
  const [r, g, b] =
    hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x]
  return `#${[r, g, b].map((value) => Math.round((value + m) * 255).toString(16).padStart(2, '0')).join('')}`
}
