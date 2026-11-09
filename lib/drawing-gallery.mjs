// The shelf of drawings in box 4-2 of the second page: the supplied doodles, then the drawings people saved from the
// drawing pad (box 4-1), the newest first. One of them can be chosen, and the input key of box 5 puts it on the match.
// A saved drawing is kept in this browser (so it is there again on the next visit) and, when the shared store is set up,
// for everyone (lib/shared-drawings.mjs); drawings others save arrive while the page is open.
import { assetPath } from './asset-path.mjs'

export const SEED_DRAWINGS = [
  ['01-red-flower', 0.9081],
  ['02-green-flower', 0.9109],
  ['03-bow', 1.1893],
  ['04-big-flower', 0.9128],
  ['05-dots', 0.2194],
  ['06-scarf', 1.4171],
  ['07-tie', 0.3309],
  ['08-mitten', 1.1228],
  ['09-star', 1.0122],
  ['10-moustache', 3.5738],
  ['11-hat', 0.9122],
  ['12-earmuffs', 1.4619],
  ['13-ball', 1.5],
  ['14-skirt', 1.8571],
  ['15-wings', 1.4585],
  ['16-mug', 1.4481],
].map(([name, aspect]) => ({ id: `seed-${name}`, src: assetPath(`media/drawings/seed-${name}.png`), aspect, seed: true }))

const STORAGE_KEY = 'epeul:saved-drawings'
const KEEP_LOCAL = 40
export const SHELF_LIMIT = 40

let saved = []
let selectedId = null
let snapshot = { drawings: SEED_DRAWINGS, selectedId: null }
let started = false
const listeners = new Set()

const emit = () => {
  // newest saved first, then the supplied doodles; no picture twice
  const seen = new Set()
  const drawings = [...saved, ...SEED_DRAWINGS].filter((drawing) => {
    if (seen.has(drawing.src)) return false
    seen.add(drawing.src)
    return true
  })
  snapshot = { drawings: drawings.slice(0, SHELF_LIMIT), selectedId }
  listeners.forEach((listener) => listener())
}

export function subscribeGallery(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getGallery() {
  return snapshot
}

const SERVER_SNAPSHOT = { drawings: SEED_DRAWINGS, selectedId: null }
export function getServerGallery() {
  return SERVER_SNAPSHOT
}

export function selectDrawing(id) {
  selectedId = selectedId === id ? null : id
  emit()
}

export function getSelectedDrawing() {
  return snapshot.drawings.find((drawing) => drawing.id === selectedId) ?? null
}

const readLocal = () => {
  try {
    const list = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(list) ? list.filter((item) => typeof item?.src === 'string' && Number.isFinite(item?.aspect)) : []
  } catch {
    return []
  }
}

const writeLocal = () => {
  try {
    const own = saved.filter((drawing) => drawing.own).slice(0, KEEP_LOCAL)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(own))
  } catch {
    // without storage the drawing still stays on the shelf until the page is left
  }
}

const addSaved = (drawings) => {
  const known = new Set(saved.map((drawing) => drawing.src))
  const fresh = drawings.filter((drawing) => !known.has(drawing.src))
  if (!fresh.length) return
  saved = [...saved, ...fresh].sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))
  emit()
}

// Load what was saved before (in this browser and, if it is set up, by everyone) and listen for new ones.
export function startGallery(store = null) {
  if (started || typeof window === 'undefined') return () => {}
  started = true
  addSaved(readLocal())
  let stop = () => {}
  if (store) {
    store
      .loadDrawings()
      .then(addSaved)
      .catch(() => {})
    try {
      const unsubscribe = store.subscribe({ onDrawing: (drawing) => addSaved([drawing]) })
      stop = () => {
        Promise.resolve(unsubscribe?.()).catch(() => {})
      }
    } catch {
      // the shelf still works from this browser's own drawings
    }
  }
  return () => {
    started = false
    stop()
  }
}

// Save a drawing from the pad: on the shelf at once, kept in this browser, and sent to the shared store if there is one.
export function saveDrawing(src, aspect, store = null) {
  const drawing = { id: `own-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, src, aspect, createdAt: Date.now(), own: true }
  saved = [drawing, ...saved]
  writeLocal()
  emit()
  if (store) store.recordDrawing({ image: src, aspect }).catch(() => {})
  return drawing
}

// for tests
export function resetGallery() {
  saved = []
  selectedId = null
  started = false
  emit()
}
