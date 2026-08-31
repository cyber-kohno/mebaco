import { describe, expect, it } from 'vitest'
import type TreeNode from '../../tree/tree-node'
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
  it('renames ordered Style Local references without touching another Style', () => {
    const local = node(4, {
      kind: 'variable', id: 'value', binding: 'const',
      typeSetting: { type: 'inferred' }, source: '1',
    })
    const next = node(5, {
      kind: 'variable', id: 'next', binding: 'const',
      typeSetting: { type: 'inferred' }, source: '$local.value + 1',
    })
    const style = node(2, {
      kind: 'style', styleId: 'style-a', id: 'a', bases: [],
      rules: [{
        type: 'declaration', property: 'z-index',
        value: { type: 'formula', source: '$local.value.toString()' },
      }],
    }, [node(3, { kind: 'style-locals' }, [local, next])])
    const other = node(6, {
      kind: 'style', styleId: 'style-b', id: 'b', bases: [],
      rules: [{
        type: 'declaration', property: 'z-index',
        value: { type: 'formula', source: '$local.value.toString()' },
      }],
    })
    const root = node(1, { kind: 'project' }, [style, other])

    const result = ExpressionReferenceRenamer.rename(root, local.id, 'amount')

    const nextStyle = result.rootNode.children[0]
    expect((nextStyle.element as { rules: Array<{ value: { source: string } }> }).rules[0].value.source)
      .toBe('$local.amount.toString()')
    expect((nextStyle.children[0].children[1].element as { source: string }).source)
      .toBe('$local.amount + 1')
    expect((result.rootNode.children[1].element as { rules: Array<{ value: { source: string } }> }).rules[0].value.source)
      .toBe('$local.value.toString()')
    expect(result.changedNodeIds).toEqual([2, 5])
  })

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

  it('renames direct App transition accessors while preserving bracket quote style', () => {
    const targetApp = node(2, { kind: 'app', appId: 'target-uuid', id: 'user-detail' })
    const action = node(5, {
      kind: 'action',
      comment: '',
      source: "const launch = $transition.userDetail; $transition['userDetail']({ id: 1 }); launch({ id: 2 })",
    })
    const sourceApp = node(3, { kind: 'app', appId: 'source-uuid', id: 'main' }, [action])
    const root = node(1, { kind: 'project' }, [targetApp, sourceApp])

    const result = ExpressionReferenceRenamer.rename(root, targetApp.id, 'user-profile')

    expect((result.rootNode.children[1].children[0].element as { source: string }).source)
      .toBe("const launch = $transition.userProfile; $transition['userProfile']({ id: 1 }); launch({ id: 2 })")
    expect(result.changedNodeIds).toEqual([5])
    expect(result.occurrenceCount).toBe(2)
  })

  it('renames direct transition argument keys while preserving their values', () => {
    const argument = node(5, {
      kind: 'launch-argument', propId: 'user-id-prop', id: 'userId',
      valueType: { type: 'number' }, nullable: false,
    })
    const targetApp = node(2, { kind: 'app', appId: 'target-uuid', id: 'user-detail' }, [
      node(3, { kind: 'launch-options' }, [
        node(4, { kind: 'launch-arguments' }, [argument]),
      ]),
    ])
    const action = node(8, {
      kind: 'action', comment: '',
      source: "$transition.userDetail({ userId: value, 'userId': other, ['userId']: third, userId }); const dynamic = { userId }; $transition.userDetail(dynamic)",
    })
    const root = node(1, { kind: 'project' }, [targetApp, action])

    const result = ExpressionReferenceRenamer.rename(root, argument.id, 'accountId')

    expect((result.rootNode.children[1].element as { source: string }).source)
      .toBe("$transition.userDetail({ accountId: value, 'accountId': other, ['accountId']: third, accountId: userId }); const dynamic = { userId }; $transition.userDetail(dynamic)")
    expect(result.changedNodeIds).toEqual([8])
    expect(result.occurrenceCount).toBe(4)
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

  it('rejects a rename that would capture a reference in a narrower scope', () => {
    const appState = node(5, { kind: 'state', id: 'data', initial: { type: 'default' } })
    const localState = node(12, { kind: 'state', id: 'result', initial: { type: 'default' } })
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

    expect(() => ExpressionReferenceRenamer.rename(root, appState.id, 'result'))
      .toThrow(ExpressionReferenceRenamer.ReferenceCaptureError)
    expect((appState.element as { id: string }).id).toBe('data')
    expect((expression.element as { condition: string }).condition).toBe('$state.data != null')
  })

  it('renames scoped $type references in assertions and generic arguments', () => {
    const firstType = node(4, {
      kind: 'object-type', typeId: 'first-user-type', id: 'User',
      baseObjectIds: [], properties: [],
    })
    const firstAction = node(5, {
      kind: 'action', comment: '',
      source: 'const user = value as $type.User; use<$type.User>(user)',
    })
    const secondType = node(8, {
      kind: 'object-type', typeId: 'second-user-type', id: 'User',
      baseObjectIds: [], properties: [],
    })
    const secondAction = node(9, {
      kind: 'action', comment: '', source: 'value as $type.User',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', appId: 'first-app', id: 'first' }, [firstType, firstAction]),
        node(7, { kind: 'app', appId: 'second-app', id: 'second' }, [secondType, secondAction]),
      ]),
    ])

    const result = ExpressionReferenceRenamer.rename(root, firstType.id, 'Account')

    const firstApp = result.rootNode.children[0].children[0]
    const secondApp = result.rootNode.children[0].children[1]
    expect((firstApp.children[0].element as { id: string }).id).toBe('Account')
    expect((firstApp.children[1].element as { source: string }).source)
      .toBe('const user = value as $type.Account; use<$type.Account>(user)')
    expect((secondApp.children[1].element as { source: string }).source)
      .toBe('value as $type.User')
    expect(result.changedNodeIds).toEqual([firstAction.id])
    expect(result.occurrenceCount).toBe(2)
  })

  it('rejects a $type rename captured by a narrower type definition', () => {
    const commonType = node(3, {
      kind: 'object-type', typeId: 'common-user-type', id: 'User',
      baseObjectIds: [], properties: [],
    })
    const localType = node(7, {
      kind: 'object-type', typeId: 'local-account-type', id: 'Account',
      baseObjectIds: [], properties: [],
    })
    const action = node(8, {
      kind: 'action', comment: '', source: 'value as $type.User',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'common' }, [commonType]),
      node(5, { kind: 'apps' }, [
        node(6, { kind: 'app', appId: 'app-uuid', id: 'app' }, [localType, action]),
      ]),
    ])

    expect(() => ExpressionReferenceRenamer.rename(root, commonType.id, 'Account'))
      .toThrow(ExpressionReferenceRenamer.ReferenceCaptureError)
    expect((commonType.element as { id: string }).id).toBe('User')
    expect((action.element as { source: string }).source).toBe('value as $type.User')
  })
})
