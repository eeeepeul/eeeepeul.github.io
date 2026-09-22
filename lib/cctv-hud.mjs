const HUD_BASE_TIME = Date.UTC(2020, 4, 2, 20, 52, 15)
const HUD_WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

function pad(value) {
  return String(value).padStart(2, '0')
}

export function formatCctvHudTimestamp(currentTime = 0) {
  const elapsedSeconds = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0
  const date = new Date(HUD_BASE_TIME + elapsedSeconds * 1000)
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${HUD_WEEKDAYS[date.getUTCDay()]}`
}
