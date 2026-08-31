import { describe, expect, it } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import ExpressionVerificationScope from './expression-verification-scope'

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

describe('ExpressionVerificationScope', () => {
  it('collects only expression candidates where a sequential Variable is visible', () => {
    const before = node(3, { kind: 'if', condition: 'true' })
    const variable = node(5, {
      kind: 'variable',
      id: 'value',
      binding: 'const',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    const nested = node(7, { kind: 'if', condition: '$var.value > 0' })
    const after = node(6, { kind: 'if', condition: '$var.value > 0' }, [nested])
    const otherScope = node(9, { kind: 'if', condition: 'true' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'function-procedure' }, [before, variable, after]),
      node(8, { kind: 'function-procedure' }, [otherScope]),
    ])

    expect(ExpressionVerificationScope.collectVisibleNodeIds(root, variable.id))
      .toEqual([after.id, nested.id])
  })

  it('collects an App State scope without affecting another App', () => {
    const state = node(5, {
      kind: 'state',
      id: 'status',
      valueType: { type: 'string' },
      nullable: false,
      initial: { type: 'default' },
    })
    const sameApp = node(6, { kind: 'if', condition: '$state.status === "ready"' })
    const componentChild = node(8, { kind: 'if', condition: '$state.status === "ready"' })
    const otherApp = node(10, { kind: 'if', condition: 'true' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', appId: 'first-id', id: 'first' }, [
          node(4, { kind: 'store' }, [node(11, { kind: 'states' }, [state])]),
          sameApp,
          node(7, { kind: 'component', componentId: 'component-id', id: 'Panel' }, [
            componentChild,
          ]),
        ]),
        node(9, { kind: 'app', appId: 'second-id', id: 'second' }, [otherApp]),
      ]),
    ])

    expect(ExpressionVerificationScope.collectVisibleNodeIds(root, state.id))
      .toEqual([sameApp.id, componentChild.id])
  })

  it('collects a Function implementation without entering nested Function scopes', () => {
    const outerAction = node(4, { kind: 'action', comment: '', source: 'undefined' })
    const nestedAction = node(8, { kind: 'action', comment: '', source: 'undefined' })
    const nestedFunction = node(6, {
      kind: 'function', id: 'nested',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [], returnType: null },
      },
      implementation: { mode: 'procedure' },
    }, [node(7, { kind: 'function-procedure' }, [nestedAction])])
    const outerFunction = node(2, {
      kind: 'function', id: 'outer',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [], returnType: null },
      },
      implementation: { mode: 'procedure' },
    }, [node(3, { kind: 'function-procedure' }, [outerAction, nestedFunction])])
    const root = node(1, { kind: 'project' }, [outerFunction])

    expect(ExpressionVerificationScope.collectFunctionVerificationNodeIds(root, outerFunction.id))
      .toEqual([outerAction.id])
  })
})
