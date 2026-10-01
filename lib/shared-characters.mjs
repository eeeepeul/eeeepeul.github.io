export const SHARED_CHARACTER_TABLE = 'character_events'
export const SHARED_CHARACTER_EVENT = 'epeul:shared-character'
export const CHARACTER_WORLD_ID = 'shared-house'

const CHARACTER_COLUMNS =
  'id, created_at, world_id, match_color, expression, flame_color, flame_shape, shoe'
const DEFAULT_PAGE_SIZE = 1_000
const OPTION_MAXIMUMS = {
  'match-color': 3,
  expression: 5,
  'flame-color': 3,
  'flame-shape': 5,
  shoes: 3,
}
let realtimeChannelId = 0

/**
 * @typedef {{
 *   'match-color': number,
 *   expression: number,
 *   'flame-color': number,
 *   'flame-shape': number,
 *   shoes: number,
 * }} CharacterCustomization
 * @typedef {{ id: number, createdAt: number, worldId: string, customization: CharacterCustomization }} SharedCharacter
 */

function isValidOption(key, value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= OPTION_MAXIMUMS[key]
}

export function normalizeCharacterCustomization(customization = {}) {
  const normalized = {
    'match-color': customization?.['match-color'],
    expression: customization?.expression,
    'flame-color': customization?.['flame-color'],
    'flame-shape': customization?.['flame-shape'],
    shoes: customization?.shoes,
  }

  if (!Object.entries(OPTION_MAXIMUMS).every(([key, maximum]) => isValidOption(key, normalized[key]))) {
    return null
  }

  return normalized
}

export function normalizeCharacterRow(row) {
  const id = Number(row?.id)
  const createdAt = Date.parse(row?.created_at)
  const worldId = row?.world_id
  const customization = normalizeCharacterCustomization({
    'match-color': Number(row?.match_color),
    expression: Number(row?.expression),
    'flame-color': Number(row?.flame_color),
    'flame-shape': Number(row?.flame_shape),
    shoes: Number(row?.shoe),
  })

  if (!Number.isSafeInteger(id) || id < 1 || !Number.isFinite(createdAt)) return null
  if (worldId !== CHARACTER_WORLD_ID || !customization) return null

  return { id, createdAt, worldId, customization }
}

function isSharedCharacter(character) {
  return (
    Number.isSafeInteger(character?.id) &&
    character.id > 0 &&
    Number.isFinite(character?.createdAt) &&
    character.worldId === CHARACTER_WORLD_ID &&
    normalizeCharacterCustomization(character.customization) !== null
  )
}

export function mergeCharacterEvents(currentCharacters, incomingCharacters) {
  const byId = new Map()

  for (const character of [...(currentCharacters || []), ...(incomingCharacters || [])]) {
    if (isSharedCharacter(character)) byId.set(character.id, character)
  }

  return [...byId.values()].sort(
    (left, right) => left.createdAt - right.createdAt || left.id - right.id
  )
}

function throwSupabaseError(error, fallbackMessage) {
  if (!error) return
  if (error instanceof Error) throw error
  throw new Error(error.message || fallbackMessage)
}

function realtimeStatus(status) {
  if (status === 'SUBSCRIBED') return 'shared'
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') return 'offline'
  return 'connecting'
}

export function createSharedCharacterStore(client) {
  if (!client || typeof client.from !== 'function' || typeof client.channel !== 'function') {
    throw new TypeError('A Supabase client is required')
  }

  return {
    async recordCharacter(customization, worldId = CHARACTER_WORLD_ID) {
      const normalized = normalizeCharacterCustomization(customization)
      if (worldId !== CHARACTER_WORLD_ID || !normalized) {
        throw new TypeError('Invalid character customization')
      }

      const { data, error } = await client
        .from(SHARED_CHARACTER_TABLE)
        .insert({
          world_id: worldId,
          match_color: normalized['match-color'],
          expression: normalized.expression,
          flame_color: normalized['flame-color'],
          flame_shape: normalized['flame-shape'],
          shoe: normalized.shoes,
        })
        .select(CHARACTER_COLUMNS)
        .single()
      throwSupabaseError(error, 'Unable to record shared character')

      const character = normalizeCharacterRow(data)
      if (!character) throw new Error('Supabase returned an invalid shared character')
      return character
    },

    async loadCharacters({ sinceMs = 0, pageSize = DEFAULT_PAGE_SIZE, worldId = CHARACTER_WORLD_ID } = {}) {
      const safeSince = Number(sinceMs)
      if (!Number.isFinite(safeSince)) throw new TypeError('Invalid character start time')
      if (worldId !== CHARACTER_WORLD_ID) throw new TypeError('Invalid character world')

      const safePageSize = Math.min(
        DEFAULT_PAGE_SIZE,
        Math.max(1, Math.floor(Number(pageSize) || DEFAULT_PAGE_SIZE))
      )
      const sinceIso = new Date(safeSince).toISOString()
      const characters = []
      let afterId = 0

      while (true) {
        const { data, error } = await client
          .from(SHARED_CHARACTER_TABLE)
          .select(CHARACTER_COLUMNS)
          .gte('created_at', sinceIso)
          .eq('world_id', worldId)
          .gt('id', afterId)
          .order('id', { ascending: true })
          .limit(safePageSize)
        throwSupabaseError(error, 'Unable to load shared characters')

        const rows = Array.isArray(data) ? data : []
        for (const row of rows) {
          const character = normalizeCharacterRow(row)
          if (character) characters.push(character)
        }

        if (rows.length < safePageSize) break
        const nextAfterId = Number(rows.at(-1)?.id)
        if (!Number.isSafeInteger(nextAfterId) || nextAfterId <= afterId) {
          throw new Error('Shared character pagination did not advance')
        }
        afterId = nextAfterId
      }

      return characters
    },

    subscribe({ onCharacter, onStatus } = {}) {
      const channel = client
        .channel(`character-events-${++realtimeChannelId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: SHARED_CHARACTER_TABLE },
          (payload) => {
            const character = normalizeCharacterRow(payload?.new)
            if (character) onCharacter?.(character)
          }
        )
        .subscribe((status) => onStatus?.(realtimeStatus(status)))

      return async () => {
        await client.removeChannel(channel)
      }
    },
  }
}

export function startSharedCharacterFeed({
  store,
  getSinceMs = () => 0,
  onCharacters,
  onStatus,
  eventTarget = globalThis.window,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
  refreshMs = 30_000,
} = {}) {
  let active = true
  let characters = []
  let unsubscribe = async () => {}
  let refreshTimer

  const publish = (incomingCharacters) => {
    if (!active) return
    const cutoff = Number(getSinceMs())
    const merged = mergeCharacterEvents(characters, incomingCharacters)
    characters = Number.isFinite(cutoff)
      ? merged.filter((character) => character.createdAt >= cutoff)
      : merged
    onCharacters?.(characters)
  }
  const handleSameTabCharacter = (event) => publish([event?.detail?.character])

  onStatus?.('connecting')

  if (!store) {
    onStatus?.('offline')
    return {
      ready: Promise.resolve([]),
      async cleanup() {
        active = false
      },
    }
  }

  eventTarget?.addEventListener?.(SHARED_CHARACTER_EVENT, handleSameTabCharacter)

  try {
    unsubscribe = store.subscribe({
      onCharacter: (character) => publish([character]),
      onStatus: (status) => {
        if (active) onStatus?.(status)
      },
    })
  } catch {
    onStatus?.('offline')
  }

  const refresh = async () => {
    try {
      const loadedCharacters = await store.loadCharacters({ sinceMs: getSinceMs() })
      publish(loadedCharacters)
      return loadedCharacters
    } catch {
      if (active) onStatus?.('offline')
      return []
    }
  }
  const ready = refresh()
  refreshTimer = setIntervalImpl?.(() => void refresh(), refreshMs)

  return {
    ready,
    async cleanup() {
      active = false
      if (refreshTimer !== undefined) clearIntervalImpl?.(refreshTimer)
      eventTarget?.removeEventListener?.(SHARED_CHARACTER_EVENT, handleSameTabCharacter)
      await unsubscribe?.()
    },
  }
}
