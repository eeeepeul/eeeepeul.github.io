// Drawings saved from the drawing pad of the second page (box 4-1) and kept for everyone (box 4-2): a picture
// (a PNG data URL of the drawing, cropped to it) and its proportion. Stored in the Supabase table below; see
// supabase/migrations/20261109000000_create_shared_drawings.sql.
export const SHARED_DRAWING_TABLE = 'shared_drawings'
export const MAX_DRAWING_LENGTH = 300_000
const DRAWING_COLUMNS = 'id, created_at, image, aspect'
let realtimeChannelId = 0

export function isDrawingImage(image) {
  return typeof image === 'string' && image.startsWith('data:image/png;base64,') && image.length <= MAX_DRAWING_LENGTH
}

export function isDrawingAspect(aspect) {
  return Number.isFinite(aspect) && aspect >= 0.02 && aspect <= 50
}

export function normalizeDrawingRow(row) {
  const id = Number(row?.id)
  const createdAt = Date.parse(row?.created_at)
  const aspect = Number(row?.aspect)
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isFinite(createdAt)) return null
  if (!isDrawingImage(row?.image) || !isDrawingAspect(aspect)) return null
  return { id: `shared-${id}`, createdAt, src: row.image, aspect }
}

function throwSupabaseError(error, fallbackMessage) {
  if (!error) return
  if (error instanceof Error) throw error
  throw new Error(error.message || fallbackMessage)
}

export function createSharedDrawingStore(client) {
  if (!client || typeof client.from !== 'function' || typeof client.channel !== 'function') {
    throw new TypeError('A Supabase client is required')
  }

  return {
    async recordDrawing({ image, aspect }) {
      if (!isDrawingImage(image) || !isDrawingAspect(aspect)) throw new TypeError('Invalid drawing')
      const { data, error } = await client
        .from(SHARED_DRAWING_TABLE)
        .insert({ image, aspect })
        .select(DRAWING_COLUMNS)
        .single()
      throwSupabaseError(error, 'Unable to save the drawing')
      const drawing = normalizeDrawingRow(data)
      if (!drawing) throw new Error('Supabase returned an invalid drawing')
      return drawing
    },

    async loadDrawings({ limit = 60 } = {}) {
      const safeLimit = Math.min(200, Math.max(1, Math.floor(Number(limit) || 60)))
      const { data, error } = await client
        .from(SHARED_DRAWING_TABLE)
        .select(DRAWING_COLUMNS)
        .order('id', { ascending: false })
        .limit(safeLimit)
      throwSupabaseError(error, 'Unable to load the drawings')
      return (Array.isArray(data) ? data : []).map(normalizeDrawingRow).filter(Boolean)
    },

    subscribe({ onDrawing } = {}) {
      const channel = client
        .channel(`shared-drawings-${++realtimeChannelId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: SHARED_DRAWING_TABLE }, (payload) => {
          const drawing = normalizeDrawingRow(payload?.new)
          if (drawing) onDrawing?.(drawing)
        })
        .subscribe()
      return async () => {
        await client.removeChannel(channel)
      }
    },
  }
}
