import assert from 'node:assert/strict'
import test from 'node:test'

import { createConfiguredVisitStore } from '../lib/supabase-browser.mjs'

test('keeps the page usable when public Supabase configuration is missing', () => {
  assert.equal(
    createConfiguredVisitStore({ url: '', publishableKey: '', createClientImpl: () => null }),
    null
  )
})

test('creates the shared store with the public URL and publishable key only', () => {
  const calls = []
  const fakeClient = {
    from() {},
    channel() {},
  }

  const store = createConfiguredVisitStore({
    url: 'https://project.supabase.co',
    publishableKey: 'sb_publishable_example',
    createClientImpl: (...args) => {
      calls.push(args)
      return fakeClient
    },
  })

  assert.equal(typeof store.recordVisit, 'function')
  assert.deepEqual(calls, [
    [
      'https://project.supabase.co',
      'sb_publishable_example',
      {
        auth: { persistSession: false },
      },
    ],
  ])
})
