import { describe, expect, it } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import ScopedVariableResolver from './scoped-variable-resolver'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('ScopedVariableResolver Promise branches', () => {
  it('limits result and error bindings to their corresponding branches', () => {
    const thenAction = node(5, { kind: 'action', comment: '', source: '$var.result' })
    const catchAction = node(7, { kind: 'action', comment: '', source: '$var.error' })
    const after = node(8, { kind: 'action', comment: '', source: '$var.result' })
    const promise = node(3, {
      kind: 'promise', id: 'result',
      resultType: { valueType: { type: 'number' }, nullable: false },
      source: 'Promise.resolve(1)',
    }, [
      node(4, { kind: 'promise-then' }, [thenAction]),
      node(6, { kind: 'promise-catch', id: 'error' }, [catchAction]),
    ])
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'function-procedure' }, [promise, after]),
    ])

    expect(ScopedVariableResolver.resolve(root, thenAction.id, 'result')).toMatchObject({
      node: { id: promise.id }, declaration: 'promise-result',
    })
    expect(ScopedVariableResolver.resolve(root, thenAction.id, 'error')).toBeNull()
    expect(ScopedVariableResolver.resolve(root, catchAction.id, 'error')).toMatchObject({
      node: { id: 6 }, declaration: 'promise-error',
    })
    expect(ScopedVariableResolver.resolve(root, catchAction.id, 'result')).toBeNull()
    expect(ScopedVariableResolver.resolve(root, after.id, 'result')).toBeNull()
  })
})
