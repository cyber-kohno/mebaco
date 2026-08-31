import { describe, expect, it } from 'vitest'
import type LoopElement from '../../element/kind/directive/loop-element'
import type TreeNode from '../../tree/tree-node'
import LoopReferenceRefactor from './loop-reference-refactor'

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

describe('LoopReferenceRefactor', () => {
  it('renames Item and Index references only inside their Loop scope', () => {
    const child = node(3, {
      kind: 'if',
      condition: '$var.item != null && $var.index > 0',
    })
    const previous: LoopElement.CollectionElement = {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'index',
    }
    const loop = node(2, previous, [child])
    const root = node(1, { kind: 'project' }, [loop])

    const plan = LoopReferenceRefactor.plan(root, loop.id, previous, {
      ...previous,
      itemId: 'row',
      indexId: 'position',
    })

    expect((findNode(plan.rootNode, child.id)?.element as { condition: string }).condition)
      .toBe('$var.row != null && $var.position > 0')
    expect(plan.changedNodeIds).toEqual([child.id])
    expect(plan.updatedOccurrenceCount).toBe(2)
    expect(plan.verificationReset).toBe(false)
  })

  it('reports Item references removed by Collection to Count mode changes', () => {
    const child = node(3, { kind: 'if', condition: '$var.item != null' })
    const previous: LoopElement.CollectionElement = {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'index',
    }
    const loop = node(2, previous, [child])
    const root = node(1, { kind: 'project' }, [loop])

    const plan = LoopReferenceRefactor.plan(root, loop.id, previous, {
      kind: 'loop',
      mode: 'count',
      countSource: '1',
      indexId: 'index',
    })

    expect(plan.removedOccurrenceCount).toBe(1)
    expect(plan.removedReferences).toEqual([{
      sourceNodeId: child.id,
      sourceLabel: 'if#condition',
      occurrenceCount: 1,
    }])
    expect(plan.verificationReset).toBe(true)
  })

  it('resets verification when a referenced Item inferred type may change', () => {
    const child = node(3, { kind: 'if', condition: '$var.item != null' })
    const previous: LoopElement.CollectionElement = {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '$state.first',
      itemId: 'item',
      indexId: 'index',
    }
    const loop = node(2, previous, [child])
    const root = node(1, { kind: 'project' }, [loop])

    const plan = LoopReferenceRefactor.plan(root, loop.id, previous, {
      ...previous,
      collectionSource: '$state.second',
    })

    expect(plan.removedOccurrenceCount).toBe(0)
    expect(plan.verificationReset).toBe(true)
  })

  it('rejects a new Item Id that captures an outer Variable reference', () => {
    const outerVariable = node(2, {
      kind: 'variable',
      id: 'item',
      binding: 'const',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    const child = node(5, { kind: 'if', condition: '$var.item > 0' })
    const previous: LoopElement.CountElement = {
      kind: 'loop',
      mode: 'count',
      countSource: '1',
      indexId: 'index',
    }
    const loop = node(4, previous, [child])
    const procedure = node(3, { kind: 'function-procedure' }, [outerVariable, loop])
    const root = node(1, { kind: 'project' }, [procedure])

    expect(() => LoopReferenceRefactor.plan(root, loop.id, previous, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'index',
    })).toThrow(LoopReferenceRefactor.ReferenceCaptureError)
  })

  it('does not rewrite a nested Loop variable with the same Id', () => {
    const nestedChild = node(5, { kind: 'if', condition: '$var.item != null' })
    const nestedLoop = node(4, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'nestedIndex',
    }, [nestedChild])
    const previous: LoopElement.CollectionElement = {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'index',
    }
    const loop = node(2, previous, [nestedLoop])
    const root = node(1, { kind: 'project' }, [loop])

    const plan = LoopReferenceRefactor.plan(root, loop.id, previous, {
      ...previous,
      itemId: 'row',
    })

    expect((findNode(plan.rootNode, nestedChild.id)?.element as { condition: string }).condition)
      .toBe('$var.item != null')
    expect(plan.updatedOccurrenceCount).toBe(0)
  })
})
