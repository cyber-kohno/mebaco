import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import type MebacoElement from '../element/element'
import type TreeNode from '../tree/tree-node'
import ExpressionVerificationStore from '../validation/expression-verification-store'
import ElementUpdateTransaction from './element-update-transaction'
import TreeStore from '../store/tree-store'

const node = (
  id: number,
  element: Record<string, unknown>,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children,
})

const findNode = (root: TreeNode.Node, nodeId: number): TreeNode.Node | null => {
  if (root.id === nodeId) return root
  for (const child of root.children) {
    const found = findNode(child, nodeId)
    if (found != null) return found
  }
  return null
}

describe('ElementUpdateTransaction', () => {
  beforeEach(() => ExpressionVerificationStore.clear())

  it('commits an Id update and its expression rewrites together', () => {
    const state = node(5, {
      kind: 'state',
      id: 'data',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'default' },
    })
    const expression = node(8, { kind: 'if', condition: '$state.data > 0' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(3, { kind: 'store' }, [node(4, { kind: 'states' }, [state])]),
        expression,
      ]),
    ])
    const previousElement = state.element as Extract<MebacoElement.Element, { kind: 'state' }>

    const result = ElementUpdateTransaction.commit(root, state.id, previousElement, {
      ...previousElement,
      id: 'result',
    })

    const nextRoot = get(TreeStore.rootNode)
    expect((findNode(nextRoot, state.id)?.element as { id: string }).id).toBe('result')
    expect((findNode(nextRoot, expression.id)?.element as { condition: string }).condition)
      .toBe('$state.result > 0')
    expect(result.updatedReferenceNodeIds).toEqual([8])
    expect(result.updatedOccurrenceCount).toBe(1)
    expect(result.verificationReset).toBe(false)
  })

  it('clears every verification result after a type change', () => {
    const state = node(5, {
      kind: 'state',
      id: 'data',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'default' },
    })
    const expression = node(8, { kind: 'if', condition: 'true' })
    const root = node(1, { kind: 'project' }, [state, expression])
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    const previousElement = state.element as Extract<MebacoElement.Element, { kind: 'state' }>

    const result = ElementUpdateTransaction.commit(root, state.id, previousElement, {
      ...previousElement,
      valueType: { type: 'string' },
    })

    expect(result.verificationReset).toBe(true)
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })
})
