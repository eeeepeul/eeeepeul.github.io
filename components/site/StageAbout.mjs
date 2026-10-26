'use client'

import { createElement, useState } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'

// Cell 3: "Description of Epeul's Data". A cover picture, a tree of folders that open and close
// (a box with a dash opens onto its children, a box with a plus is closed), and the text below.
// Pressing a name selects it and the name shows at the foot. All sizes are in the units of the
// supplied picture (650 wide), scaled with the cell through --u in the stylesheet.
const TREE = {
  id: 'epeul',
  label: 'epeul',
  kids: [
    {
      id: 'mooeemee',
      label: 'mooeemee',
      kids: [
        {
          id: 'a',
          label: '9+1',
          kids: [
            { id: 'a1', label: 'explain' },
            { id: 'a2', label: 'explain' },
            { id: 'a3', label: 'explain' },
            { id: 'a4', label: 'explain' },
          ],
        },
        { id: 'b', label: '9+1', kids: [] },
        { id: 'c', label: '9+1', kids: [] },
        { id: 'd', label: '9+1', kids: [] },
      ],
    },
  ],
}

const DESCRIPTION =
  'EPEUL is a VJ artist who explores the idea that, much like the proverb "no flower blooms for more than ten days," all things must eventually bloom and fade. Rather than focusing solely on the fleeting moment of a flower in bloom, EPEUL turns their attention to the long, enduring span of time that makes such a moment possible. Guided by the philosophy that "the leaf exists before the flower," the artist highlights'

function TreeNode({ node, depth, last, open, selected, onToggle, onSelect }) {
  const isOpen = open[node.id] !== false
  const leaf = !node.kids
  const children = node.kids || []
  return createElement(
    'li',
    {
      className: `about-node${last ? ' is-last' : ''}${leaf ? ' is-leaf' : ''}`,
      'data-depth': depth,
      role: 'treeitem',
      'aria-expanded': leaf ? undefined : isOpen,
      'aria-selected': selected === node.id,
    },
    createElement(
      'div',
      { className: `about-row${selected === node.id ? ' is-selected' : ''}` },
      leaf
        ? null
        : createElement(
            'button',
            {
              type: 'button',
              className: `about-toggle${isOpen ? '' : ' is-closed'}`,
              'aria-label': `${node.label} ${isOpen ? '접기' : '펼치기'}`,
              onClick: () => onToggle(node.id),
            },
            createElement('i')
          ),
      createElement('span', { className: 'about-icon', 'aria-hidden': 'true' }),
      createElement(
        'button',
        { type: 'button', className: 'about-label', onClick: () => onSelect(node) },
        node.label
      )
    ),
    !leaf && isOpen && children.length
      ? createElement(
          'ul',
          { className: 'about-kids', role: 'group' },
          children.map((child, index) =>
            createElement(TreeNode, {
              key: child.id,
              node: child,
              depth: depth + 1,
              last: index === children.length - 1,
              open,
              selected,
              onToggle,
              onSelect,
            })
          )
        )
      : null
  )
}

export function StageAbout() {
  const [open, setOpen] = useState({})
  const [selected, setSelected] = useState('a')
  const [selectedLabel, setSelectedLabel] = useState('9+1')

  return createElement(
    'div',
    { className: 'about' },
    createElement(
      'div',
      { className: 'about-panel' },
      createElement('header', { className: 'about-title' }, "Description of Epeul's Data"),
      createElement(
        'div',
        { className: 'about-body' },
        createElement('img', {
          className: 'about-cover',
          src: assetPath('panels/epeul-cover.png'),
          alt: '',
          draggable: false,
        }),
        createElement(
          'ul',
          { className: 'about-tree', role: 'tree', 'aria-label': 'Epeul 데이터 구조' },
          createElement(TreeNode, {
            node: TREE,
            depth: 0,
            last: true,
            open,
            selected,
            onToggle: (id) => setOpen((current) => ({ ...current, [id]: current[id] === false })),
            onSelect: (node) => {
              setSelected(node.id)
              setSelectedLabel(node.label)
            },
          })
        )
      ),
      createElement(
        'div',
        { className: 'about-text' },
        createElement('p', null, DESCRIPTION),
        createElement(
          'div',
          { className: 'about-foot' },
          createElement('span', { className: 'about-foot__name' }, selectedLabel),
          createElement('i', { className: 'about-foot__play', 'aria-hidden': 'true' }),
          createElement('i', { className: 'about-foot__bar', 'aria-hidden': 'true' })
        )
      )
    )
  )
}
