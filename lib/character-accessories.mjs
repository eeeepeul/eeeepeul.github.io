// Things drawn on the drawing pad and put on the match in the custom sidebar. Kept apart
// from both so the pad and the sidebar need not be on screen together: each item is a picture
// (a data URL) and where it sits on the match, as fractions of the match's box.
let items = []
let version = 0
let nextId = 1
const listeners = new Set()

const emit = () => {
  version += 1
  items = items.slice()
  listeners.forEach((listener) => listener())
}

export function subscribeAccessories(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAccessories() {
  return items
}

export function addAccessory(src, aspect = 1) {
  const id = nextId
  nextId += 1
  // First on the middle of the body, a little over half as wide as the match.
  items = [...items, { id, src, aspect, x: 0.5, y: 0.45, width: 0.7 }]
  emit()
  return id
}

export function updateAccessory(id, patch) {
  items = items.map((item) => (item.id === id ? { ...item, ...patch } : item))
  emit()
}

export function removeAccessory(id) {
  items = items.filter((item) => item.id !== id)
  emit()
}

export function clearAccessories() {
  items = []
  emit()
}

export function getAccessoryVersion() {
  return version
}
