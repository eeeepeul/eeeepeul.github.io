import test from 'node:test'
import assert from 'node:assert/strict'

let brandMarkSvg
try {
  ;({ brandMarkSvg } = await import('../lib/brand-mark.mjs'))
} catch {
  brandMarkSvg = undefined
}

test('renders the supplied mark at a 64 pixel width without distorting its viewBox', () => {
  assert.equal(typeof brandMarkSvg, 'function')

  const markup = brandMarkSvg()
  assert.match(markup, /width="64" height="80" viewBox="0 0 106 132"/)
  assert.match(markup, /<rect x="44" y="102" width="72" height="62" transform="rotate\(-90 44 102\)" fill="#D9D9D9"\/>/)
  assert.match(markup, /<path d="M2\.88495e-06 66L56\.25 8\.84233L56\.25 123\.158L2\.88495e-06 66Z" fill="#D9D9D9"\/>/)
})
