import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '@system/model/tree/tree-node'
import StyleElement from '@system/model/view/style/style'
import StyleElementDefinition from './style-element-definition'

vi.mock('@system/workspace/tree/state', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('Style category', () => {
  it('stores a trimmed optional category without changing the Style identity', () => {
    const schema = StyleElementDefinition.createSchema()
    const created = schema.create({
      id: 'panel', category: '  layout  ', rules: '[]', animations: '[]', bases: '[]',
    })

    expect(created).toMatchObject({ id: 'panel', category: 'layout' })

    const updated = schema.update(created, {
      id: 'panel', category: '', rules: '[]', animations: '[]', bases: '[]',
    })
    expect(updated.styleId).toBe(created.styleId)
    expect(updated).not.toHaveProperty('category')
  })

  it('adds category metadata to reference options and collects unique suggestions', () => {
    const layout = { ...StyleElement.create('panel', [], [], 'layout-style'), category: 'layout' }
    const duplicate = { ...StyleElement.create('grid', [], [], 'grid-style'), category: 'layout' }
    const uncategorized = StyleElement.create('accent', [], [], 'accent-style')
    const root = node(1, { kind: 'project' }, [
      node(2, layout),
      node(3, duplicate),
      node(4, uncategorized),
    ])

    expect(StyleElementDefinition.getStyleOptions(root)).toEqual([
      { value: 'layout-style', label: 'panel', category: 'layout' },
      { value: 'grid-style', label: 'grid', category: 'layout' },
      { value: 'accent-style', label: 'accent' },
    ])
    expect(StyleElementDefinition.getCategoryOptions(root)).toEqual([{ value: 'layout' }])
  })

  it('offers existing categories while still allowing free text', () => {
    const schema = StyleElementDefinition.createSchema({
      categoryOptions: [{ value: 'layout' }, { value: 'theme' }],
    })

    expect(schema.fields.find((field) => field.key === 'category')).toMatchObject({
      type: 'text',
      width: 'id',
      maxLength: 32,
      suggestions: [{ value: 'layout' }, { value: 'theme' }],
    })
  })
})
