'use client'

import { createElement, Fragment, useEffect, useId, useState } from 'react'

const SIDEBAR_WORDMARK_URL =
  'https://roman-grace-53629873.figma.site/_assets/v11/d9b8c63aac76f638bf8691a056ed2fb6ae3f62cd.svg'
const SIDEBAR_TOGGLE_URL =
  'https://roman-grace-53629873.figma.site/_assets/v11/bc284c4d5aba5c5ff0c267e810ee1f631720da12.svg'
const SIDEBAR_FOOTER_MARK_URL =
  'https://roman-grace-53629873.figma.site/_assets/v11/ba25c24dc25092eec09b7d7aa2b65fb4fa60f04e.svg'

export function nextSidebarOpenState(currentState, action) {
  if (action === 'open') return true
  if (action === 'close') return false
  if (action === 'toggle') return !currentState
  return currentState
}

export function ResponsiveSidebar({ children, className = '', label = '사이드 메뉴' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const panelId = useId()
  const panelClassName = `color-panel sidebar-panel${className ? ` ${className}` : ''}${
    isOpen ? ' is-open' : ''
  }${isDismissed ? ' is-dismissed' : ''}`

  const changeOpenState = (action) => {
    setIsOpen((currentState) => nextSidebarOpenState(currentState, action))
    if (action === 'open') setIsDismissed(false)
    if (action === 'close') setIsDismissed(true)
  }

  useEffect(() => {
    if (!isOpen || !window.matchMedia('(max-width: 800px)').matches) return undefined

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') changeOpenState('close')
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return createElement(
    Fragment,
    null,
    createElement(
      'button',
      {
        type: 'button',
        className: `sidebar-menu-trigger${isDismissed ? ' is-visible' : ''}`,
        'aria-label': '메뉴 열기',
        'aria-expanded': isOpen,
        'aria-controls': panelId,
        onClick: () => changeOpenState('open'),
      },
      createElement('img', {
        className: 'sidebar-toggle-image',
        src: SIDEBAR_TOGGLE_URL,
        alt: '',
        draggable: false,
      })
    ),
    createElement('button', {
      type: 'button',
      className: `sidebar-backdrop${isOpen ? ' is-open' : ''}`,
      'aria-hidden': !isOpen,
      'aria-label': '메뉴 닫기',
      tabIndex: isOpen ? 0 : -1,
      onClick: () => changeOpenState('close'),
    }),
    createElement(
      'aside',
      {
        className: panelClassName,
        id: panelId,
        'aria-label': label,
      },
      createElement(
        'div',
        { className: 'sidebar-header' },
        createElement('img', {
          className: 'sidebar-wordmark',
          src: SIDEBAR_WORDMARK_URL,
          alt: 'M:MH',
          draggable: false,
        }),
        createElement(
          'button',
          {
            type: 'button',
            className: 'sidebar-close-button',
            'aria-label': '메뉴 닫기',
            onClick: () => changeOpenState('close'),
          },
          createElement('img', {
            className: 'sidebar-toggle-image',
            src: SIDEBAR_TOGGLE_URL,
            alt: '',
            draggable: false,
          })
        )
      ),
      createElement('div', { className: 'sidebar-content' }, children),
      createElement('img', {
        className: 'sidebar-footer-mark',
        src: SIDEBAR_FOOTER_MARK_URL,
        alt: '',
        draggable: false,
      })
    )
  )
}
