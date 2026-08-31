import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import TreeStore from '../../store/tree-store'
import ExpressionVerificationStore from '../../validation/expression/expression-verification-store'

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

describe('ElementMutationCoordinator removal verification impact', () => {
  beforeEach(() => ExpressionVerificationStore.clear())

  it('resets verification when a removed definition has a surviving expression reference', () => {
    const state = node(2, {
      kind: 'state',
      id: 'data',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'default' },
    })
    const reference = node(3, { kind: 'if', condition: '$state.data > 0' })
    TreeStore.replaceRoot(node(1, { kind: 'project' }, [state, reference]))
    ExpressionVerificationStore.setResult(reference, { status: 'verified', messages: [] })

    TreeStore.removeNode(state.id)

    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })

  it('keeps unrelated verification when the removed definition has no expression reference', () => {
    const state = node(2, {
      kind: 'state',
      id: 'data',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'default' },
    })
    const unrelated = node(3, { kind: 'if', condition: 'true' })
    TreeStore.replaceRoot(node(1, { kind: 'project' }, [state, unrelated]))
    ExpressionVerificationStore.setResult(unrelated, { status: 'verified', messages: [] })

    TreeStore.removeNode(state.id)

    expect(get(ExpressionVerificationStore.entries)).not.toEqual({})
  })

  it('never resets verification when deleting a Loop and its local scope', () => {
    const localVariable = node(3, {
      kind: 'variable',
      id: 'value',
      binding: 'const',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    const loop = node(2, {
      kind: 'loop',
      mode: 'count',
      countSource: '1',
      indexId: 'index',
    }, [localVariable])
    const outside = node(4, { kind: 'if', condition: '$var.value > 0' })
    TreeStore.replaceRoot(node(1, { kind: 'project' }, [loop, outside]))
    ExpressionVerificationStore.setResult(outside, { status: 'verified', messages: [] })

    TreeStore.removeNode(loop.id)

    expect(get(ExpressionVerificationStore.entries)).not.toEqual({})
  })
})
