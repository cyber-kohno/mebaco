import { describe, expect, it } from 'vitest'
import type TreeNode from '../../../../tree/tree-node'
import type StyleElement from './style-element'
import StyleTreeLabelPresentation from './style-tree-label-presentation'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('StyleTreeLabelPresentation', () => {
  it('counts declarations across default and state rules', () => {
    const style: StyleElement.Element = {
      kind: 'style',
      styleId: 'button-style',
      id: 'button',
      bases: [],
      rules: [
        { type: 'declaration', property: 'display', value: { type: 'literal', value: 'flex' } },
        {
          type: 'state',
          state: 'hover',
          declarations: [
            { type: 'declaration', property: 'color', value: { type: 'literal', value: 'red' } },
            { type: 'declaration', property: 'opacity', value: { type: 'literal', value: '1' } },
          ],
        },
      ],
    }

    expect(StyleTreeLabelPresentation.countProperties(style)).toBe(3)
  })

  it('resolves inherited Style ids to their names in configured order', () => {
    const rect: StyleElement.Element = {
      kind: 'style', styleId: 'rect-style', id: 'rect', rules: [], bases: [],
    }
    const bgColor: StyleElement.Element = {
      kind: 'style', styleId: 'background-style', id: 'bgColor', rules: [], bases: [],
    }
    const owner: StyleElement.Element = {
      kind: 'style',
      styleId: 'owner-style',
      id: 'owner',
      rules: [],
      bases: [
        { referenceId: 'base-1', styleId: rect.styleId, arguments: [] },
        { referenceId: 'base-2', styleId: bgColor.styleId, arguments: [] },
      ],
    }
    const root = node(1, { kind: 'project' }, [
      node(2, rect),
      node(3, bgColor),
      node(4, owner),
    ])

    expect(StyleTreeLabelPresentation.getInheritedStyleNames(root, owner))
      .toEqual(['rect', 'bgColor'])
  })
})
