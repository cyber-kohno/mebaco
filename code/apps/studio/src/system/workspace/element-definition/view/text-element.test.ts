import { beforeEach, describe, expect, it, vi } from 'vitest'
import type TreeNode from '@system/model/tree/tree-node'
import TreeStore from '@system/workspace/tree/state'
import TextElement from '@system/model/view/text'
import TextElementDefinition from './text-element-definition'

vi.mock('@system/workspace/tree/state', () => ({
  default: {
    removeNode: vi.fn(),
  },
}))

describe('TextElement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('supports the shared node disabled state', () => {
    expect(TextElementDefinition.definition.canDisable).toBe(true)
  })

  it('stores literal and formula text with the shared resolvable value shape', () => {
    expect(TextElement.createLiteral('Hello')).toEqual({
      kind: 'text',
      source: { type: 'literal', value: 'Hello' },
    })
    expect(TextElement.createFormula('$state.title')).toEqual({
      kind: 'text',
      source: { type: 'formula', source: '$state.title' },
    })
  })

  it('edits Text through one compact source field', () => {
    const schema = TextElementDefinition.createSchema()
    expect(schema.fields).toEqual([{
      type: 'textSource',
      key: 'source',
      label: 'Text',
      defaultValue: JSON.stringify({ type: 'literal', value: '' }),
      maxLiteralLength: 200,
      maxFormulaLength: 4000,
    }])

    const formula = TextElement.createFormula('$state.title')
    const values = schema.getInitialValues(formula)
    expect(values).toEqual({
      source: JSON.stringify({ type: 'formula', source: '$state.title' }),
    })
    expect(schema.update(formula, {
      source: JSON.stringify({ type: 'literal', value: 'Updated' }),
    })).toEqual(TextElement.createLiteral('Updated'))
  })

  it('rejects the removed plain and formula-value shapes', () => {
    expect(TextElement.parseSource(JSON.stringify({ type: 'plain', value: 'Legacy' }))).toBeNull()
    expect(TextElement.parseSource(JSON.stringify({ type: 'formula', value: '$state.title' }))).toBeNull()
  })

  it('offers a Delete action that removes the Text node', () => {
    const textNode = {
      id: 2,
      element: TextElement.createLiteral('Hello'),
      isOpen: true,
      children: [],
    } satisfies TreeNode.Node
    const rootNode = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [textNode],
    } satisfies TreeNode.Node

    const items = TextElementDefinition.definition.getContextMenu({
      element: textNode.element,
      node: textNode,
      parentNode: rootNode,
      rootNode,
    })
    expect(items.map((item) => item.label)).toEqual(['Modify', 'Delete'])
    const deleteItem = items.find((item) => item.label === 'Delete')
    if (deleteItem?.type !== 'action') throw new Error('Delete action was not found.')

    deleteItem.callback()

    expect(TreeStore.removeNode).toHaveBeenCalledWith(textNode.id)
  })
})
