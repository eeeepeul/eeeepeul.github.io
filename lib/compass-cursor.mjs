export function getCompassDirection(previous, next) {
  const deltaX = next.x - previous.x
  const deltaY = next.y - previous.y

  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX >= 0 ? 'right' : 'left'
  return deltaY >= 0 ? 'down' : 'up'
}
