import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

assert.ok(url, 'NEXT_PUBLIC_SUPABASE_URL is required')
assert.ok(publishableKey, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required')

const clientOptions = { auth: { persistSession: false } }
const reader = createClient(url, publishableKey, clientOptions)
const writer = createClient(url, publishableKey, clientOptions)

const { error: selectError } = await reader
  .from('visit_events')
  .select('id, visited_at, house_id')
  .limit(1)
assert.equal(selectError, null, selectError?.message)

const beforeInsert = Date.now()
const { data: generalVisit, error: generalInsertError } = await writer
  .from('visit_events')
  .insert({ house_id: null })
  .select('id, visited_at, house_id')
  .single()
assert.equal(generalInsertError, null, generalInsertError?.message)
assert.equal(generalVisit.house_id, null)
assert.ok(Date.parse(generalVisit.visited_at) >= beforeInsert - 5_000)
assert.ok(Date.parse(generalVisit.visited_at) <= Date.now() + 5_000)

const { error: invalidInsertError } = await writer
  .from('visit_events')
  .insert({ house_id: 'house9' })
assert.ok(
  invalidInsertError && ['23514', '42501'].includes(invalidInsertError.code),
  `Expected invalid house insert to be denied, got ${invalidInsertError?.code || 'no error'}`
)

const { error: updateError } = await writer
  .from('visit_events')
  .update({ house_id: 'house2' })
  .eq('id', generalVisit.id)
assert.equal(updateError?.code, '42501')

const { error: deleteError } = await writer.from('visit_events').delete().eq('id', generalVisit.id)
assert.equal(deleteError?.code, '42501')

let resolveRealtime
let rejectRealtime
const realtimeVisit = new Promise((resolve, reject) => {
  resolveRealtime = resolve
  rejectRealtime = reject
})
const timeout = setTimeout(() => rejectRealtime(new Error('Realtime insert timed out')), 15_000)
let resolveReady
let rejectReady
const realtimeReady = new Promise((resolve, reject) => {
  resolveReady = resolve
  rejectReady = reject
})
const readyTimeout = setTimeout(
  () => rejectReady(new Error('Realtime subscription did not connect')),
  15_000
)
const channel = reader
  .channel(`visit-events-verification-${Date.now()}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visit_events' }, (payload) =>
    resolveRealtime(payload.new)
  )
  .subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      clearTimeout(readyTimeout)
      resolveReady()
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      clearTimeout(readyTimeout)
      const connectionError = error || new Error(`Realtime status: ${status}`)
      rejectReady(connectionError)
      rejectRealtime(connectionError)
    }
  })

await realtimeReady
// A sleeping free project can report channel readiness just before its replication stream finishes.
await new Promise((resolve) => setTimeout(resolve, 5_000))

const { data: houseVisit, error: houseInsertError } = await writer
  .from('visit_events')
  .insert({ house_id: 'house4' })
  .select('id, visited_at, house_id')
  .single()
assert.equal(houseInsertError, null, houseInsertError?.message)

const receivedVisit = await realtimeVisit
clearTimeout(timeout)
assert.equal(Number(receivedVisit.id), Number(houseVisit.id))
assert.equal(receivedVisit.house_id, 'house4')

await reader.removeChannel(channel)

console.log(
  JSON.stringify({
    generalVisitId: Number(generalVisit.id),
    houseVisitId: Number(houseVisit.id),
    realtime: true,
    select: true,
    serverTimestamp: true,
    invalidInsertDenied: true,
    updateDenied: true,
    deleteDenied: true,
  })
)
