// How close the camera of the room on the second pages is: 1 is the view the page always had, more is nearer, less
// is further off (down to ROOM_ZOOM_MIN: past it the picture would stop short of the edges of the box). The status bar's keys change it and the camera
// (FollowingCharacterWorld) follows it.
export const ROOM_ZOOM_MIN = 0.7
export const ROOM_ZOOM_MAX = 3
export const ROOM_ZOOM_STEP = 1.25 // each key press makes the view this much nearer or further

let zoom = 1
const listeners = new Set()

export function getRoomZoom() {
  return zoom
}

export function setRoomZoom(next) {
  zoom = Math.min(ROOM_ZOOM_MAX, Math.max(ROOM_ZOOM_MIN, next))
  listeners.forEach((listener) => listener(zoom))
}

export function subscribeRoomZoom(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
