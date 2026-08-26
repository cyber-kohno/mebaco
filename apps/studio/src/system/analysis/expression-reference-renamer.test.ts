import { describe, expect, it } from 'vitest'
import type TreeNode from '../tree/tree-node'
import ExpressionReferenceRenamer from './expression-reference-renamer'

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

describe('ExpressionReferenceRenamer', () => {
  it('renames state references in direct and JSON-contained expressions atomically', () => {
    const state = node(5, { kind: 'state', id: 'data', initial: { type: 'default' } })
    const tag = node(8, {
      kind: 'tag',
      tagName: 'div',
      comment: '',
      attributes: JSON.stringify([{
        type: 'attribute',
        name: 'title',
        value: { type: 'formula', source: "$state.data + $state['data']" },
      }]),
      styles: [],
    })
    const conditional = node(9, { kind: 'if', condition: '$state.data > 0' })
    const app = node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
      node(3, { kind: 'store' }, [node(4, { kind: 'states' }, [state])]),
      tag,
      conditional,
    ])
    const root = node(1, { kind: 'project' }, [app])

    const result = ExpressionReferenceRenamer.rename(root, state.id, 'result')

    expect((result.rootNode.children[0].children[0].children[0].children[0].element as { id: string }).id)
      .toBe('result')
    const nextTag = result.rootNode.children[0].children[1].element as unknown as { attributes: string }
    expect(nextTag.attributes).toContain('$state.result')
    expect(nextTag.attributes).toContain("$state['result']")
    expect((result.rootNode.children[0].children[2].element as { condition: string }).condition)
      .toBe('$state.result > 0')
    expect(result.changedNodeIds).toEqual([8, 9])
    expect(result.occurrenceCount).toBe(3)

    expect((state.element as { id: string }).id).toBe('data')
    expect((conditional.element as { condition: string }).condition).toBe('$state.data > 0')
  })

  it('renames app ids used by system transitions while preserving quote style', () => {
    const targetApp = node(2, { kind: 'app', appId: 'target-uuid', id: 'detail' })
    const action = node(5, {
      kind: 'action',
      source: "$system.transition('detail', { id: 1 })",
    })
    const sourceApp = node(3, { kind: 'app', appId: 'source-uuid', id: 'main' }, [action])
    const root = node(1, { kind: 'project' }, [targetApp, sourceApp])

    const result = ExpressionReferenceRenamer.rename(root, targetApp.id, 'result')

    expect((result.rootNode.children[1].children[0].element as { source: string }).source)
      .toBe("$system.transition('result', { id: 1 })")
    expect(result.changedNodeIds).toEqual([5])
  })

  it('does not rewrite a shadowed component state with the same id', () => {
    const appState = node(5, { kind: 'state', id: 'data', initial: { type: 'default' } })
    const localState = node(12, { kind: 'state', id: 'data', initial: { type: 'default' } })
    const expression = node(15, { kind: 'if', condition: '$state.data != null' })
    const component = node(10, { kind: 'component', componentId: 'component-uuid', id: 'Card' }, [
      node(11, { kind: 'store' }, [node(13, { kind: 'states' }, [localState])]),
      expression,
    ])
    const app = node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
      node(3, { kind: 'store' }, [node(4, { kind: 'states' }, [appState])]),
      component,
    ])
    const root = node(1, { kind: 'project' }, [app])

    const result = ExpressionReferenceRenamer.rename(root, appState.id, 'globalData')

    expect((result.rootNode.children[0].children[1].children[1].element as { condition: string }).condition)
      .toBe('$state.data != null')
    expect(result.changedNodeIds).toEqual([])
  })
})
