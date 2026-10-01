import { createClient } from '@supabase/supabase-js'
import { createSharedCharacterStore } from './shared-characters.mjs'
import { createSharedVisitStore } from './shared-visits.mjs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

let sharedVisitStore
let sharedCharacterStore

export function createConfiguredVisitStore({
  url = '',
  publishableKey = '',
  createClientImpl = createClient,
} = {}) {
  const normalizedUrl = typeof url === 'string' ? url.trim() : ''
  const normalizedKey = typeof publishableKey === 'string' ? publishableKey.trim() : ''
  if (!normalizedUrl || !normalizedKey) return null

  const client = createClientImpl(normalizedUrl, normalizedKey, {
    auth: { persistSession: false },
  })
  return createSharedVisitStore(client)
}

export function createConfiguredCharacterStore({
  url = '',
  publishableKey = '',
  createClientImpl = createClient,
} = {}) {
  const normalizedUrl = typeof url === 'string' ? url.trim() : ''
  const normalizedKey = typeof publishableKey === 'string' ? publishableKey.trim() : ''
  if (!normalizedUrl || !normalizedKey) return null

  const client = createClientImpl(normalizedUrl, normalizedKey, {
    auth: { persistSession: false },
  })
  return createSharedCharacterStore(client)
}

export function getSharedVisitStore() {
  if (sharedVisitStore === undefined) {
    sharedVisitStore = createConfiguredVisitStore({
      url: SUPABASE_URL,
      publishableKey: SUPABASE_PUBLISHABLE_KEY,
    })
  }

  return sharedVisitStore
}

export function getSharedCharacterStore() {
  if (sharedCharacterStore === undefined) {
    sharedCharacterStore = createConfiguredCharacterStore({
      url: SUPABASE_URL,
      publishableKey: SUPABASE_PUBLISHABLE_KEY,
    })
  }

  return sharedCharacterStore
}
