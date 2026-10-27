'use client'

import { createElement as h, useEffect, useRef, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// The question that greets a visitor who arrives at the home page: a small card in the middle of
// the stage, the rest of the stage dimmed behind it. The card is the supplied one (a grey head
// with the question, a box with the hand-lettered "What did you do?", a field for the visitor's
// answer, and a Welcome button). Welcome opens the stage. The answer is kept in this browser.
// The lettering in the picture is one of five supplied versions, picked at random each time the
// card opens; the arrows in the corner of the picture pick another one.
// Sizes are on the 2000-plan scale and grow and shrink with the stage (1 unit = 0.05cqw).
const ANSWER_KEY = 'welcome-answer'
const LETTERINGS = 5

export function StageWelcome() {
  const [open, setOpen] = useState(true)
  // null until the card is on screen, so the server and the first paint agree
  const [lettering, setLettering] = useState(null)
  const fieldRef = useRef(null)

  useEffect(() => {
    setLettering(1 + Math.floor(Math.random() * LETTERINGS))
  }, [])

  const another = () =>
    setLettering((current) => {
      const next = 1 + Math.floor(Math.random() * (LETTERINGS - 1))
      return current && next >= current ? next + 1 : next
    })

  useEffect(() => {
    if (open && fieldRef.current) fieldRef.current.focus({ preventScroll: true })
  }, [open])

  if (!open) return null

  const enter = (event) => {
    event.preventDefault()
    try {
      const answer = fieldRef.current ? fieldRef.current.value.trim() : ''
      if (answer) localStorage.setItem(ANSWER_KEY, answer)
    } catch {
      // the answer simply is not kept when the browser blocks storage
    }
    setOpen(false)
  }

  return h(
    'div',
    { className: 'welcome', role: 'presentation' },
    h(
      'form',
      { className: 'welcome__card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'welcome-question', onSubmit: enter },
      h('h2', { id: 'welcome-question', className: 'welcome__head' }, 'What did you bring back from today?'),
      h(
        'div',
        { className: 'welcome__picture' },
        lettering
          ? h('img', {
              key: lettering,
              className: 'welcome__title',
              src: assetPath(`media/welcome-title-${lettering}.webp`),
              alt: 'What did you do?',
              draggable: false,
            })
          : null
      ),
      // the supplied icon, at its place in the supplied card; it brings another lettering
      h(
        'button',
        { type: 'button', className: 'welcome__again', 'aria-label': '다른 글씨로 바꾸기', onClick: another },
        h('img', { src: assetPath('media/welcome-again.png'), alt: '', draggable: false })
      ),
      h('label', { className: 'welcome__label', htmlFor: 'welcome-answer' }, 'Character :'),
      h('input', { ref: fieldRef, id: 'welcome-answer', className: 'welcome__field', type: 'text', placeholder: 'What did you do?', autoComplete: 'off', maxLength: 80 }),
      h('button', { type: 'submit', className: 'welcome__enter' }, 'Welcome')
    )
  )
}
