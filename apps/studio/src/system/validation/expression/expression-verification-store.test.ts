import { describe, expect, it, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import ExpressionVerificationStore from './expression-verification-store'
import type TreeNode from '../../tree/tree-node'

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

  it('invalidates only the requested node results', () => {
    const first = node(21, { kind: 'text', source: '"first"' })
    const second = node(22, { kind: 'text', source: '"second"' })
    ExpressionVerificationStore.setResult(first, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(second, { status: 'verified', messages: [] })

    ExpressionVerificationStore.invalidateNodes([first.id])

    expect(get(ExpressionVerificationStore.entries)[first.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[second.id]).toBeDefined()
  })

  it('keeps an Action result for comment-only changes', () => {
    const action = node(31, {
      kind: 'action',
      comment: 'Before',
      source: '$state.count += 1',
    })
    const root = node(1, { kind: 'project' })
    root.children = [action]
    ExpressionVerificationStore.setResult(action, {
      status: 'verified',
      messages: [],
    })

    action.element = {
      ...action.element,
      comment: 'After',
    } as TreeNode.Node['element']

    expect(ExpressionVerificationStore.getStatus(root, action)).toBe('verified')
  })

  it('invalidates an Action result when its source changes', () => {
    const action = node(31, {
      kind: 'action',
      comment: 'Update count',
      source: '$state.count += 1',
    })
    const root = node(1, { kind: 'project' })
    root.children = [action]
    ExpressionVerificationStore.setResult(action, {
      status: 'verified',
      messages: [],
    })

    action.element = {
      ...action.element,
      source: '$state.count += 2',
    } as TreeNode.Node['element']

    expect(ExpressionVerificationStore.getStatus(root, action)).toBe('unverified')
  })

  it('treats Procedure structure as a verification candidate and tracks child order', () => {
    const procedure = node(20, { kind: 'function-procedure' })
    procedure.children = [
      node(21, { kind: 'function-return' }),
      node(22, { kind: 'action', comment: '', source: 'after()' }),
    ]
    const root = node(1, { kind: 'project' })
    root.children = [procedure]

    expect(ExpressionVerificationStore.getStatus(root, procedure)).toBe('unverified')
    ExpressionVerificationStore.setResult(procedure, {
      status: 'error',
      messages: ['unreachable'],
    })
    expect(ExpressionVerificationStore.getStatus(root, procedure)).toBe('error')

    procedure.children.reverse()
    expect(ExpressionVerificationStore.getStatus(root, procedure)).toBe('unverified')
  })
})
