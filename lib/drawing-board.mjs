// The way between the small drawing pad (box 4-1, DrawingPad) and the large Paint window (StagePaint): the pad registers
// itself here with what it can do (its canvas, its colour and brush, its undo history, input and save), and the window
// works the same board through it, so what is drawn in either shows in both. Both are told when something changed.
let board = null
const listeners = new Set()

export function registerBoard(next) {
  board = next
  listeners.forEach((listener) => listener())
  return () => {
    if (board === next) board = null
    listeners.forEach((listener) => listener())
  }
}

export const getBoard = () => board
export const notifyBoard = () => listeners.forEach((listener) => listener())

export function subscribeBoard(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
