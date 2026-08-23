import { describe, expect, it, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import ExpressionVerificationStore from './expression-verification-store'
import type TreeNode from '../tree/tree-node'

const node = (
  id: number,
  element: Record<string, unknown>,
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children: [],
})

describe('ExpressionVerificationStore', () => {
  beforeEach(() => ExpressionVerificationStore.clear())

  it('starts candidates as unverified and stores element-level results', () => {
    const target = node(21, { kind: 'text', source: '"hello"' })
    const root = node(1, { kind: 'project' })
    root.children = [target]

    expect(ExpressionVerificationStore.getStatus(root, target)).toBe('unverified')

    ExpressionVerificationStore.setResult(target, {
      status: 'verified',
      messages: [],
    })
    expect(ExpressionVerificationStore.getStatus(root, target)).toBe('verified')
  })

  it('invalidates a result when the element changes and prunes removed nodes', () => {
    const target = node(21, { kind: 'text', source: '"hello"' })
    const root = node(1, { kind: 'project' })
    root.children = [target]
    ExpressionVerificationStore.setResult(target, { status: 'verified', messages: [] })

    target.element = { kind: 'text', source: '"changed"' } as unknown as TreeNode.Node['element']
    ExpressionVerificationStore.syncRoot(root)
    expect(ExpressionVerificationStore.getStatus(root, target)).toBe('unverified')

    ExpressionVerificationStore.syncRoot(node(1, { kind: 'project' }))
    expect(get(ExpressionVerificationStore.entries)[21]).toBeUndefined()
  })
})
