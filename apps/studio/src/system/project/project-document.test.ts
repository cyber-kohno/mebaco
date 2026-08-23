import { describe, expect, it } from 'vitest'
import type TreeNode from '../tree/tree-node'
import ProjectDocument from './project-document'

const node = (
  id: number,
  element: Record<string, unknown>,
  children: TreeNode.Node[] = [],
  options: Pick<TreeNode.Node, 'isOpen' | 'disabled'> = { isOpen: true },
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: options.isOpen ?? true,
  ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
  children,
})

describe('ProjectDocument', () => {
  it('ignores editor-only node state', () => {
    const closed = node(1, { kind: 'project' }, [
      node(10, { kind: 'tag', id: 'main' }, [], { isOpen: false }),
    ])
    const open = node(99, { kind: 'project' }, [
      node(42, { kind: 'tag', id: 'main' }, [], { isOpen: true, disabled: false }),
    ])

    expect(ProjectDocument.createFingerprint(closed))
      .toBe(ProjectDocument.createFingerprint(open))
  })

  it('detects semantic element changes, disabled state, and order', () => {
    const first = node(1, { kind: 'project' }, [
      node(2, { kind: 'tag', id: 'first' }),
      node(3, { kind: 'tag', id: 'second' }),
    ])
    const changed = node(1, { kind: 'project' }, [
      node(2, { kind: 'tag', id: 'second' }, [], { isOpen: true, disabled: true }),
      node(3, { kind: 'tag', id: 'first' }),
    ])

    expect(ProjectDocument.createFingerprint(first))
      .not.toBe(ProjectDocument.createFingerprint(changed))
  })
})
