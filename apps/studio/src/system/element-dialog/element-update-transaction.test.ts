import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import type MebacoElement from '../element/element'
import type TreeNode from '../tree/tree-node'
import ExpressionVerificationStore from '../validation/expression/expression-verification-store'
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

  it('renames $type references without treating an Id-only change as a type contract change', () => {
    const userType = node(3, {
      kind: 'object-type', typeId: 'user-type', id: 'User',
      baseObjectIds: [], properties: [],
    })
    const affected = node(5, {
      kind: 'action', comment: '', source: 'value as $type.User',
    })
    const unaffected = node(6, {
      kind: 'if', condition: 'true',
    })
    const root = node(1, { kind: 'project' }, [userType, affected, unaffected])
    ExpressionVerificationStore.setResult(affected, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = userType.element as Extract<
      MebacoElement.Element,
      { kind: 'object-type' }
    >

    const result = ElementUpdateTransaction.commit(root, userType.id, previousElement, {
      ...previousElement,
      id: 'Account',
    })

    const nextRoot = get(TreeStore.rootNode)
    expect((findNode(nextRoot, userType.id)?.element as { id: string }).id).toBe('Account')
    expect((findNode(nextRoot, affected.id)?.element as { source: string }).source)
      .toBe('value as $type.Account')
    expect(result.updatedReferenceNodeIds).toEqual([affected.id])
    expect(result.updatedOccurrenceCount).toBe(1)
    expect(result.verificationReset).toBe(false)
    expect(get(ExpressionVerificationStore.entries)[unaffected.id]).toBeDefined()
  })

  it('rejects an incompatible Union update before mutating the tree', () => {
    const union = node(3, {
      kind: 'union-type', typeId: 'status-type', id: 'Status',
      definition: { type: 'literal', valueType: 'string', values: ['ready', 'done'] },
    })
    const state = node(5, {
      kind: 'state', id: 'status',
      valueType: { type: 'named', namedTypeId: 'status-type' },
      nullable: false, initial: { type: 'literal', value: 'done' },
    })
    const root = node(1, { kind: 'project' }, [union, state])
    const previousElement = union.element as Extract<
      MebacoElement.Element,
      { kind: 'union-type' }
    >

    expect(() => ElementUpdateTransaction.commit(root, union.id, previousElement, {
      ...previousElement,
      definition: { type: 'literal', valueType: 'string', values: ['ready'] },
    })).toThrow("Union Type 'Status' cannot be updated")
    expect((union.element as typeof previousElement).definition)
      .toEqual({ type: 'literal', valueType: 'string', values: ['ready', 'done'] })
    expect((state.element as { initial: unknown }).initial)
      .toEqual({ type: 'literal', value: 'done' })
  })

  it('clears every verification result after a referenced State type changes', () => {
    const state = node(5, {
      kind: 'state',
      id: 'data',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'default' },
    })
    const expression = node(8, { kind: 'if', condition: '$state.data > 0' })
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

  it('keeps verification results outside the changed State scope', () => {
    const state = node(5, {
      kind: 'state',
      id: 'data',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'default' },
    })
    const affected = node(8, { kind: 'if', condition: '$state.data > 0' })
    const unaffected = node(12, { kind: 'if', condition: 'true' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', appId: 'first-id', id: 'first' }, [
          node(4, { kind: 'store' }, [node(6, { kind: 'states' }, [state])]),
          affected,
        ]),
        node(10, { kind: 'app', appId: 'second-id', id: 'second' }, [unaffected]),
      ]),
    ])
    ExpressionVerificationStore.setResult(affected, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = state.element as Extract<MebacoElement.Element, { kind: 'state' }>

    const result = ElementUpdateTransaction.commit(root, state.id, previousElement, {
      ...previousElement,
      valueType: { type: 'string' },
    })

    const entries = get(ExpressionVerificationStore.entries)
    expect(result.verificationImpact).toEqual({ type: 'nodes', nodeIds: [affected.id] })
    expect(entries[affected.id]).toBeUndefined()
    expect(entries[unaffected.id]).toBeDefined()
  })

  it('ignores same-name State references from another App scope', () => {
    const referencedState = node(5, {
      kind: 'state', id: 'data', valueType: { type: 'number' },
      nullable: false, initial: { type: 'default' },
    })
    const changedState = node(15, {
      kind: 'state', id: 'data', valueType: { type: 'number' },
      nullable: false, initial: { type: 'default' },
    })
    const firstAppExpression = node(8, { kind: 'if', condition: '$state.data > 0' })
    const secondAppExpression = node(18, { kind: 'if', condition: 'true' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', appId: 'first-id', id: 'first' }, [
          node(4, { kind: 'store' }, [node(6, { kind: 'states' }, [referencedState])]),
          firstAppExpression,
        ]),
        node(13, { kind: 'app', appId: 'second-id', id: 'second' }, [
          node(14, { kind: 'store' }, [node(16, { kind: 'states' }, [changedState])]),
          secondAppExpression,
        ]),
      ]),
    ])
    ExpressionVerificationStore.setResult(firstAppExpression, {
      status: 'verified', messages: [],
    })
    ExpressionVerificationStore.setResult(secondAppExpression, {
      status: 'verified', messages: [],
    })
    const previousElement = changedState.element as Extract<
      MebacoElement.Element,
      { kind: 'state' }
    >

    const result = ElementUpdateTransaction.commit(
      root,
      changedState.id,
      previousElement,
      { ...previousElement, valueType: { type: 'string' } },
    )

    expect(result.verificationImpact).toEqual({ type: 'none' })
    expect(get(ExpressionVerificationStore.entries)[firstAppExpression.id]).toBeDefined()
    expect(get(ExpressionVerificationStore.entries)[secondAppExpression.id]).toBeDefined()
  })

  it('keeps unrelated verification results when an unreferenced State type changes', () => {
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

    expect(result.verificationReset).toBe(false)
    expect(get(ExpressionVerificationStore.entries)).not.toEqual({})
  })

  it('invalidates only the edited Switch when its value type changes', () => {
    const switchNode = node(5, {
      kind: 'switch',
      valueType: { type: 'primitive', primitive: 'string' },
      source: '$state.status',
    })
    const unrelated = node(8, { kind: 'if', condition: 'true' })
    const root = node(1, { kind: 'project' }, [switchNode, unrelated])
    ExpressionVerificationStore.setResult(switchNode, {
      status: 'verified',
      messages: [],
    })
    ExpressionVerificationStore.setResult(unrelated, {
      status: 'verified',
      messages: [],
    })
    const previousElement = switchNode.element as Extract<
      MebacoElement.Element,
      { kind: 'switch' }
    >

    const result = ElementUpdateTransaction.commit(
      root,
      switchNode.id,
      previousElement,
      {
        ...previousElement,
        valueType: { type: 'primitive', primitive: 'number' },
      },
    )

    const nextRoot = get(TreeStore.rootNode)
    const nextSwitch = findNode(nextRoot, switchNode.id)
    expect(nextSwitch).not.toBeNull()
    expect(result.verificationReset).toBe(false)
    expect(ExpressionVerificationStore.getStatus(nextRoot, nextSwitch!)).toBe('unverified')
    expect(ExpressionVerificationStore.getStatus(nextRoot, unrelated)).toBe('verified')
  })

  it('does not reset other verification results when a State initial value changes', () => {
    const state = node(5, {
      kind: 'state',
      id: 'data',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'default' },
    })
    const expression = node(8, { kind: 'if', condition: '$state.data > 0' })
    const root = node(1, { kind: 'project' }, [state, expression])
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    const previousElement = state.element as Extract<MebacoElement.Element, { kind: 'state' }>

    const result = ElementUpdateTransaction.commit(root, state.id, previousElement, {
      ...previousElement,
      initial: { type: 'literal', value: '10' },
    })

    expect(result.verificationReset).toBe(false)
    expect(get(ExpressionVerificationStore.entries)).not.toEqual({})
  })

  it('resets verification when a referenced inferred Variable source changes', () => {
    const variable = node(5, {
      kind: 'variable',
      id: 'value',
      binding: 'const',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    const expression = node(8, { kind: 'if', condition: '$var.value > 0' })
    const procedure = node(4, { kind: 'function-procedure' }, [variable, expression])
    const root = node(1, { kind: 'project' }, [procedure])
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    const previousElement = variable.element as Extract<MebacoElement.Element, { kind: 'variable' }>

    const result = ElementUpdateTransaction.commit(root, variable.id, previousElement, {
      ...previousElement,
      source: "'text'",
    })

    expect(result.verificationReset).toBe(true)
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })

  it('keeps verification results outside the changed Variable scope', () => {
    const variable = node(5, {
      kind: 'variable',
      id: 'value',
      binding: 'const',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    const affected = node(8, { kind: 'if', condition: '$var.value > 0' })
    const unaffected = node(12, { kind: 'if', condition: 'true' })
    const root = node(1, { kind: 'project' }, [
      node(4, { kind: 'function-procedure' }, [variable, affected]),
      node(11, { kind: 'function-procedure' }, [unaffected]),
    ])
    ExpressionVerificationStore.setResult(affected, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = variable.element as Extract<MebacoElement.Element, { kind: 'variable' }>

    const result = ElementUpdateTransaction.commit(root, variable.id, previousElement, {
      ...previousElement,
      source: "'text'",
    })

    const entries = get(ExpressionVerificationStore.entries)
    expect(result.verificationImpact).toEqual({ type: 'nodes', nodeIds: [affected.id] })
    expect(entries[affected.id]).toBeUndefined()
    expect(entries[unaffected.id]).toBeDefined()
  })

  it('keeps unrelated verification when an unreferenced inferred Variable source changes', () => {
    const variable = node(5, {
      kind: 'variable',
      id: 'value',
      binding: 'const',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    const unrelated = node(8, { kind: 'if', condition: 'true' })
    const procedure = node(4, { kind: 'function-procedure' }, [variable, unrelated])
    const root = node(1, { kind: 'project' }, [procedure])
    ExpressionVerificationStore.setResult(unrelated, { status: 'verified', messages: [] })
    const previousElement = variable.element as Extract<MebacoElement.Element, { kind: 'variable' }>

    const result = ElementUpdateTransaction.commit(root, variable.id, previousElement, {
      ...previousElement,
      source: "'text'",
    })

    expect(result.verificationReset).toBe(false)
    expect(get(ExpressionVerificationStore.entries)).not.toEqual({})
  })

  it('renames scoped Variable references without resetting verification', () => {
    const variable = node(5, {
      kind: 'variable',
      id: 'value',
      binding: 'const',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    const expression = node(8, { kind: 'if', condition: '$var.value > 0' })
    const procedure = node(4, { kind: 'function-procedure' }, [variable, expression])
    const root = node(1, { kind: 'project' }, [procedure])
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    const previousElement = variable.element as Extract<MebacoElement.Element, { kind: 'variable' }>

    const result = ElementUpdateTransaction.commit(root, variable.id, previousElement, {
      ...previousElement,
      id: 'result',
    })

    const nextRoot = get(TreeStore.rootNode)
    expect((findNode(nextRoot, expression.id)?.element as { condition: string }).condition)
      .toBe('$var.result > 0')
    expect(result.updatedReferenceNodeIds).toEqual([expression.id])
    expect(result.updatedOccurrenceCount).toBe(1)
    expect(result.verificationReset).toBe(false)
  })

  it('keeps other verification when an explicitly typed Variable source changes', () => {
    const variable = node(5, {
      kind: 'variable',
      id: 'value',
      binding: 'let',
      typeSetting: {
        type: 'explicit',
        valueType: { type: 'number' },
        nullable: false,
      },
      source: '1',
    })
    const expression = node(8, { kind: 'if', condition: '$var.value > 0' })
    const procedure = node(4, { kind: 'function-procedure' }, [variable, expression])
    const root = node(1, { kind: 'project' }, [procedure])
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    const previousElement = variable.element as Extract<MebacoElement.Element, { kind: 'variable' }>

    const result = ElementUpdateTransaction.commit(root, variable.id, previousElement, {
      ...previousElement,
      source: '2',
    })

    expect(result.verificationReset).toBe(false)
    expect(get(ExpressionVerificationStore.entries)).not.toEqual({})
  })

  it('resets verification when referenced Variable mutability changes', () => {
    const variable = node(5, {
      kind: 'variable',
      id: 'value',
      binding: 'let',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    const expression = node(8, { kind: 'action', source: '$var.value = 2', comment: '' })
    const procedure = node(4, { kind: 'function-procedure' }, [variable, expression])
    const root = node(1, { kind: 'project' }, [procedure])
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    const previousElement = variable.element as Extract<MebacoElement.Element, { kind: 'variable' }>

    const result = ElementUpdateTransaction.commit(root, variable.id, previousElement, {
      ...previousElement,
      binding: 'const',
    })

    expect(result.verificationReset).toBe(true)
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })

  it('renames Loop Item and Index references atomically', () => {
    const loop = node(5, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'index',
    }, [node(8, {
      kind: 'if',
      condition: '$var.item != null && $var.index > 0',
    })])
    const root = node(1, { kind: 'project' }, [loop])
    const previousElement = loop.element as Extract<MebacoElement.Element, { kind: 'loop' }>
    if (previousElement.mode !== 'collection') throw new Error('Fixture is invalid.')

    const result = ElementUpdateTransaction.commit(root, loop.id, previousElement, {
      ...previousElement,
      itemId: 'row',
      indexId: 'position',
    })

    const nextLoop = findNode(get(TreeStore.rootNode), loop.id)
    expect((nextLoop?.children[0]?.element as { condition: string }).condition)
      .toBe('$var.row != null && $var.position > 0')
    expect(result.updatedReferenceNodeIds).toEqual([8])
    expect(result.updatedOccurrenceCount).toBe(2)
    expect(result.verificationReset).toBe(false)
  })

  it('resets verification when a referenced Loop Item inferred type may change', () => {
    const child = node(8, { kind: 'if', condition: '$var.item != null' })
    const loop = node(5, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '$state.first',
      itemId: 'item',
      indexId: 'index',
    }, [child])
    const root = node(1, { kind: 'project' }, [loop])
    ExpressionVerificationStore.setResult(child, { status: 'verified', messages: [] })
    const previousElement = loop.element as Extract<MebacoElement.Element, { kind: 'loop' }>
    if (previousElement.mode !== 'collection') throw new Error('Fixture is invalid.')

    const result = ElementUpdateTransaction.commit(root, loop.id, previousElement, {
      ...previousElement,
      collectionSource: '$state.second',
    })

    expect(result.verificationReset).toBe(true)
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })

  it('keeps broken Item expressions and resets verification after a forced Count change', () => {
    const child = node(8, { kind: 'if', condition: '$var.item != null' })
    const loop = node(5, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'index',
    }, [child])
    const root = node(1, { kind: 'project' }, [loop])
    ExpressionVerificationStore.setResult(child, { status: 'verified', messages: [] })
    const previousElement = loop.element as Extract<MebacoElement.Element, { kind: 'loop' }>

    const result = ElementUpdateTransaction.commit(root, loop.id, previousElement, {
      kind: 'loop',
      mode: 'count',
      countSource: '1',
      indexId: 'index',
    })

    const nextLoop = findNode(get(TreeStore.rootNode), loop.id)
    expect((nextLoop?.children[0]?.element as { condition: string }).condition)
      .toBe('$var.item != null')
    expect(result.verificationReset).toBe(true)
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })

  it('updates transition accessors and resets verification after an App ID change', () => {
    const targetApp = node(2, { kind: 'app', appId: 'target-uuid', id: 'user-detail' })
    const action = node(5, {
      kind: 'action',
      comment: '',
      source: '$transition.userDetail({})',
    })
    const root = node(1, { kind: 'project' }, [
      targetApp,
      node(3, { kind: 'app', appId: 'source-uuid', id: 'main' }, [action]),
    ])
    ExpressionVerificationStore.setResult(action, { status: 'verified', messages: [] })
    const previousElement = targetApp.element as Extract<MebacoElement.Element, { kind: 'app' }>

    const result = ElementUpdateTransaction.commit(root, targetApp.id, previousElement, {
      ...previousElement,
      id: 'user-profile',
    })

    const nextRoot = get(TreeStore.rootNode)
    expect((findNode(nextRoot, action.id)?.element as { source: string }).source)
      .toBe('$transition.userProfile({})')
    expect(result.updatedReferenceNodeIds).toEqual([5])
    expect(result.updatedOccurrenceCount).toBe(1)
    expect(result.verificationReset).toBe(true)
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })

  it('renames Signature Parameter references without resetting verification', () => {
    const signature = node(3, {
      kind: 'signature-type', typeId: 'handler-signature', id: 'Handler',
      async: false,
      parameters: [{
        parameterId: 'value-parameter', id: 'value',
        valueType: { type: 'number' }, nullable: false,
      }],
      returnType: null,
    })
    const action = node(8, {
      kind: 'action', comment: '', source: '$args.value + 1',
    })
    const referFunction = node(5, {
      kind: 'function',
      id: 'handle',
      signature: { mode: 'refer', signatureTypeId: 'handler-signature' },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' }, [action])])
    const root = node(1, { kind: 'project' }, [signature, referFunction])
    ExpressionVerificationStore.setResult(action, { status: 'verified', messages: [] })
    const previousElement = signature.element as Extract<
      MebacoElement.Element,
      { kind: 'signature-type' }
    >

    const result = ElementUpdateTransaction.commit(root, signature.id, previousElement, {
      ...previousElement,
      parameters: [{ ...previousElement.parameters[0], id: 'amount' }],
    })

    const nextRoot = get(TreeStore.rootNode)
    expect((findNode(nextRoot, action.id)?.element as { source: string }).source)
      .toBe('$args.amount + 1')
    expect(result.updatedReferenceNodeIds).toEqual([action.id])
    expect(result.updatedOccurrenceCount).toBe(1)
    expect(result.verificationReset).toBe(false)
    expect(result.notices).toEqual([])
    expect(get(ExpressionVerificationStore.entries)[action.id]).toBeDefined()
  })

  it('keeps Refer Function Code identifiers and resets the Function after a Parameter rename', () => {
    const signature = node(3, {
      kind: 'signature-type', typeId: 'handler-signature', id: 'Handler',
      async: false,
      parameters: [{
        parameterId: 'value-parameter', id: 'value',
        valueType: { type: 'number' }, nullable: false,
      }],
      returnType: { valueType: { type: 'number' }, nullable: false },
    })
    const referFunction = node(5, {
      kind: 'function', id: 'handle',
      signature: { mode: 'refer', signatureTypeId: 'handler-signature' },
      implementation: { mode: 'code', source: 'return value' },
    })
    const root = node(1, { kind: 'project' }, [signature, referFunction])
    ExpressionVerificationStore.setResult(referFunction, {
      status: 'verified', messages: [],
    })
    const previousElement = signature.element as Extract<
      MebacoElement.Element,
      { kind: 'signature-type' }
    >

    const result = ElementUpdateTransaction.commit(root, signature.id, previousElement, {
      ...previousElement,
      parameters: [{ ...previousElement.parameters[0], id: 'amount' }],
    })

    const updatedFunction = findNode(get(TreeStore.rootNode), referFunction.id)?.element
    expect(updatedFunction?.kind).toBe('function')
    if (updatedFunction?.kind !== 'function') return
    expect(updatedFunction.implementation).toEqual({
      mode: 'code', source: 'return value',
    })
    expect(result.verificationImpact).toEqual({
      type: 'nodes', nodeIds: [referFunction.id],
    })
    expect(get(ExpressionVerificationStore.entries)[referFunction.id]).toBeUndefined()
  })

  it('resets only dependent Refer Procedure statements and call sites after a Signature Parameter type change', () => {
    const parameter = {
      parameterId: 'value-parameter', id: 'value',
      valueType: { type: 'number' as const }, nullable: false,
    }
    const signature = node(3, {
      kind: 'signature-type', typeId: 'handler-signature', id: 'Handler',
      async: false, parameters: [parameter], returnType: null,
    })
    const dependent = node(7, {
      kind: 'action', comment: '', source: '$args.value + 1',
    })
    const unaffectedBody = node(8, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const referFunction = node(5, {
      kind: 'function', id: 'handle',
      signature: { mode: 'refer', signatureTypeId: 'handler-signature' },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' }, [dependent, unaffectedBody])])
    const call = node(10, {
      kind: 'action', comment: '', source: '$fn.handle(1)',
    })
    const unaffectedOutside = node(11, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const root = node(1, { kind: 'project' }, [
      signature,
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(4, { kind: 'declares' }, [
          node(9, { kind: 'functions' }, [referFunction]),
        ]),
        call,
        unaffectedOutside,
      ]),
    ])
    ;[dependent, unaffectedBody, call, unaffectedOutside].forEach((target) => {
      ExpressionVerificationStore.setResult(target, { status: 'verified', messages: [] })
    })
    const previousElement = signature.element as Extract<
      MebacoElement.Element,
      { kind: 'signature-type' }
    >

    const result = ElementUpdateTransaction.commit(root, signature.id, previousElement, {
      ...previousElement,
      parameters: [{ ...parameter, valueType: { type: 'string' } }],
    })

    expect(result.verificationImpact).toEqual({
      type: 'nodes', nodeIds: [call.id, dependent.id],
    })
    expect(get(ExpressionVerificationStore.entries)[call.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[dependent.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[unaffectedBody.id]).toBeDefined()
    expect(get(ExpressionVerificationStore.entries)[unaffectedOutside.id]).toBeDefined()
  })

  it('leaves owned Function Code parameter identifiers for Verify after a rename', () => {
    const functionNode = node(3, {
      kind: 'function',
      id: 'double',
      signature: {
        mode: 'inline',
        definition: {
          async: false,
          parameters: [{
            parameterId: 'value-parameter',
            id: 'value',
            valueType: { type: 'number' },
            nullable: false,
          }],
          returnType: { valueType: { type: 'number' }, nullable: false },
        },
      },
      implementation: { mode: 'code', source: 'return value * 2' },
    })
    const root = node(1, { kind: 'project' }, [functionNode])
    ExpressionVerificationStore.setResult(functionNode, { status: 'verified', messages: [] })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >
    if (previousElement.signature.mode !== 'inline') return

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: {
        ...previousElement.signature,
        definition: {
          ...previousElement.signature.definition,
          parameters: [{
            ...previousElement.signature.definition.parameters[0],
            id: 'amount',
          }],
        },
      },
    })

    const updated = findNode(get(TreeStore.rootNode), functionNode.id)?.element
    expect(updated?.kind).toBe('function')
    if (updated?.kind !== 'function') return
    expect(updated.implementation).toEqual({
      mode: 'code',
      source: 'return value * 2',
    })
    expect(result.updatedReferenceNodeIds).toEqual([])
    expect(result.updatedOccurrenceCount).toBe(0)
    expect(result.verificationImpact).toEqual({ type: 'nodes', nodeIds: [functionNode.id] })
    expect(result.verificationReset).toBe(true)
    expect(get(ExpressionVerificationStore.entries)[functionNode.id]).toBeUndefined()
  })

  it('renames only scope-resolved Function calls and resets their verification', () => {
    const functionNode = node(5, {
      kind: 'function', id: 'calculate',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [], returnType: null },
      },
      implementation: { mode: 'code', source: 'return $fn.calculate()' },
    })
    const call = node(8, {
      kind: 'action', comment: '', source: '$fn.calculate()',
    })
    const unaffected = node(18, { kind: 'action', comment: '', source: 'undefined' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'functions' }, [functionNode]),
        ]),
        call,
      ]),
      unaffected,
    ])
    ExpressionVerificationStore.setResult(functionNode, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(call, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      id: 'compute',
    })

    expect((findNode(get(TreeStore.rootNode), call.id)?.element as { source: string }).source)
      .toBe('$fn.compute()')
    const updatedFunction = findNode(get(TreeStore.rootNode), functionNode.id)?.element
    expect(updatedFunction?.kind).toBe('function')
    if (updatedFunction?.kind !== 'function') return
    expect(updatedFunction.implementation).toEqual({
      mode: 'code', source: 'return $fn.compute()',
    })
    expect(result.updatedReferenceNodeIds).toEqual([functionNode.id, call.id])
    expect(result.updatedOccurrenceCount).toBe(2)
    expect(result.verificationImpact).toEqual({
      type: 'nodes', nodeIds: [functionNode.id, call.id],
    })
    expect(get(ExpressionVerificationStore.entries)[functionNode.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[call.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[unaffected.id]).toBeDefined()
  })

  it('renames Inline Procedure Parameter references without resetting verification', () => {
    const parameter = {
      parameterId: 'value-parameter', id: 'value',
      valueType: { type: 'number' as const }, nullable: false,
    }
    const dependent = node(7, {
      kind: 'action', comment: '', source: '$args.value + 1',
    })
    const unaffected = node(8, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const functionNode = node(5, {
      kind: 'function', id: 'calculate',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [parameter], returnType: null },
      },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' }, [dependent, unaffected])])
    const root = node(1, { kind: 'project' }, [functionNode])
    ExpressionVerificationStore.setResult(dependent, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >
    if (previousElement.signature.mode !== 'inline') return

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: {
        ...previousElement.signature,
        definition: {
          ...previousElement.signature.definition,
          parameters: [{ ...parameter, id: 'amount' }],
        },
      },
    })

    expect((findNode(get(TreeStore.rootNode), dependent.id)?.element as { source: string }).source)
      .toBe('$args.amount + 1')
    expect(result.updatedReferenceNodeIds).toEqual([dependent.id])
    expect(result.updatedOccurrenceCount).toBe(1)
    expect(result.verificationImpact).toEqual({ type: 'none' })
    expect(get(ExpressionVerificationStore.entries)[dependent.id]).toBeDefined()
    expect(get(ExpressionVerificationStore.entries)[unaffected.id]).toBeDefined()
  })

  it('resets only dependent Procedure statements and Function call sites after a Parameter type change', () => {
    const parameter = {
      parameterId: 'value-parameter', id: 'value',
      valueType: { type: 'number' as const }, nullable: false,
    }
    const dependent = node(7, {
      kind: 'action', comment: '', source: '$args.value + 1',
    })
    const unaffectedBody = node(8, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const functionNode = node(5, {
      kind: 'function', id: 'calculate',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [parameter], returnType: null },
      },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' }, [dependent, unaffectedBody])])
    const call = node(10, {
      kind: 'action', comment: '', source: '$fn.calculate(1)',
    })
    const unaffectedOutside = node(11, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'functions' }, [functionNode]),
        ]),
        call,
        unaffectedOutside,
      ]),
    ])
    ;[dependent, unaffectedBody, call, unaffectedOutside].forEach((target) => {
      ExpressionVerificationStore.setResult(target, { status: 'verified', messages: [] })
    })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >
    if (previousElement.signature.mode !== 'inline') return

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: {
        ...previousElement.signature,
        definition: {
          ...previousElement.signature.definition,
          parameters: [{ ...parameter, valueType: { type: 'string' } }],
        },
      },
    })

    expect(result.verificationImpact).toEqual({
      type: 'nodes', nodeIds: [call.id, dependent.id],
    })
    expect(get(ExpressionVerificationStore.entries)[call.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[dependent.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[unaffectedBody.id]).toBeDefined()
    expect(get(ExpressionVerificationStore.entries)[unaffectedOutside.id]).toBeDefined()
  })

  it('keeps Procedure verification and resets only call sites after a Parameter is added', () => {
    const body = node(7, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const functionNode = node(5, {
      kind: 'function', id: 'calculate',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [], returnType: null },
      },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' }, [body])])
    const call = node(10, {
      kind: 'action', comment: '', source: '$fn.calculate()',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'functions' }, [functionNode]),
        ]),
        call,
      ]),
    ])
    ExpressionVerificationStore.setResult(body, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(call, { status: 'verified', messages: [] })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >
    if (previousElement.signature.mode !== 'inline') return

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: {
        ...previousElement.signature,
        definition: {
          ...previousElement.signature.definition,
          parameters: [{
            parameterId: 'value-parameter', id: 'value',
            valueType: { type: 'number' }, nullable: false,
          }],
        },
      },
    })

    expect(result.verificationImpact).toEqual({
      type: 'nodes', nodeIds: [call.id],
    })
    expect(get(ExpressionVerificationStore.entries)[call.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[body.id]).toBeDefined()
  })

  it('resets only Return and call sites after a Function return type change', () => {
    const parameter = {
      parameterId: 'value-parameter', id: 'value',
      valueType: { type: 'number' as const }, nullable: false,
    }
    const body = node(7, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const returnNode = node(8, {
      kind: 'function-return', source: '$args.value',
    })
    const functionNode = node(5, {
      kind: 'function', id: 'calculate',
      signature: {
        mode: 'inline',
        definition: {
          async: false,
          parameters: [parameter],
          returnType: { valueType: { type: 'number' }, nullable: false },
        },
      },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' }, [body, returnNode])])
    const call = node(10, {
      kind: 'action', comment: '', source: '$fn.calculate(1)',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'functions' }, [functionNode]),
        ]),
        call,
      ]),
    ])
    ;[body, returnNode, call].forEach((target) => {
      ExpressionVerificationStore.setResult(target, { status: 'verified', messages: [] })
    })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >
    if (previousElement.signature.mode !== 'inline') return

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: {
        ...previousElement.signature,
        definition: {
          ...previousElement.signature.definition,
          returnType: { valueType: { type: 'string' }, nullable: false },
        },
      },
    })

    expect(result.verificationImpact).toEqual({
      type: 'nodes', nodeIds: [call.id, returnNode.id],
    })
    expect(get(ExpressionVerificationStore.entries)[call.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[returnNode.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[body.id]).toBeDefined()
  })

  it('resets the Function Procedure scope and call sites after Async changes', () => {
    const body = node(7, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const returnNode = node(8, {
      kind: 'function-return', source: '',
    })
    const functionNode = node(5, {
      kind: 'function', id: 'run',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [], returnType: null },
      },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' }, [body, returnNode])])
    const call = node(10, {
      kind: 'action', comment: '', source: '$fn.run()',
    })
    const unaffected = node(11, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'functions' }, [functionNode]),
        ]),
        call,
        unaffected,
      ]),
    ])
    ;[body, returnNode, call, unaffected].forEach((target) => {
      ExpressionVerificationStore.setResult(target, { status: 'verified', messages: [] })
    })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >
    if (previousElement.signature.mode !== 'inline') return

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: {
        ...previousElement.signature,
        definition: { ...previousElement.signature.definition, async: true },
      },
    })

    expect(result.verificationImpact).toEqual({
      type: 'nodes', nodeIds: [call.id, body.id, returnNode.id],
    })
    expect(get(ExpressionVerificationStore.entries)[call.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[body.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[returnNode.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[unaffected.id]).toBeDefined()
  })

  it('resets only the Function subtree when an unreferenced contract changes', () => {
    const functionNode = node(5, {
      kind: 'function', id: 'calculate',
      signature: {
        mode: 'inline',
        definition: {
          async: false,
          parameters: [],
          returnType: { valueType: { type: 'number' }, nullable: false },
        },
      },
      implementation: { mode: 'code', source: 'return 1' },
    })
    const unaffected = node(18, { kind: 'action', comment: '', source: 'undefined' })
    const root = node(1, { kind: 'project' }, [functionNode, unaffected])
    ExpressionVerificationStore.setResult(functionNode, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >
    if (previousElement.signature.mode !== 'inline') return

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: {
        ...previousElement.signature,
        definition: {
          ...previousElement.signature.definition,
          returnType: { valueType: { type: 'string' }, nullable: false },
        },
      },
    })

    expect(result.verificationImpact).toEqual({ type: 'nodes', nodeIds: [functionNode.id] })
    expect(result.notices).toEqual([
      'Function Signature changed. Function implementation and call arguments were not modified; run Verify.',
    ])
    expect(get(ExpressionVerificationStore.entries)[functionNode.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[unaffected.id]).toBeDefined()
  })

  it('resets only the Function and its call sites when a referenced contract changes', () => {
    const parameter = {
      parameterId: 'value-parameter', id: 'value',
      valueType: { type: 'number' as const }, nullable: false,
    }
    const functionNode = node(5, {
      kind: 'function', id: 'calculate',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [parameter], returnType: null },
      },
      implementation: { mode: 'code', source: 'return undefined' },
    })
    const call = node(8, {
      kind: 'action', comment: '', source: '$fn.calculate(1)',
    })
    const unaffected = node(18, { kind: 'action', comment: '', source: 'undefined' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'functions' }, [functionNode]),
        ]),
        call,
      ]),
      unaffected,
    ])
    ExpressionVerificationStore.setResult(call, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >
    if (previousElement.signature.mode !== 'inline') return

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: {
        ...previousElement.signature,
        definition: {
          ...previousElement.signature.definition,
          parameters: [{ ...parameter, valueType: { type: 'string' } }],
        },
      },
    })

    expect(result.verificationImpact).toEqual({ type: 'nodes', nodeIds: [call.id, functionNode.id] })
    expect(result.verificationReset).toBe(true)
    expect(get(ExpressionVerificationStore.entries)[call.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[functionNode.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[unaffected.id]).toBeDefined()
  })

  it('resets a Procedure subtree and reports a Refer Signature replacement', () => {
    const body = node(7, {
      kind: 'action', comment: '', source: '$args.value',
    })
    const functionNode = node(5, {
      kind: 'function', id: 'calculate',
      signature: { mode: 'refer', signatureTypeId: 'first-signature' },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' }, [body])])
    const unaffected = node(18, { kind: 'action', comment: '', source: 'undefined' })
    const call = node(10, {
      kind: 'action', comment: '', source: '$fn.calculate(1)',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'functions' }, [functionNode]),
        ]),
        call,
      ]),
      unaffected,
    ])
    ExpressionVerificationStore.setResult(body, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(call, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = functionNode.element as Extract<
      MebacoElement.Element,
      { kind: 'function' }
    >

    const result = ElementUpdateTransaction.commit(root, functionNode.id, previousElement, {
      ...previousElement,
      signature: { mode: 'refer', signatureTypeId: 'second-signature' },
    })

    expect(result.verificationImpact).toEqual({
      type: 'nodes', nodeIds: [call.id, body.id],
    })
    expect(result.notices).toEqual([
      'Referenced Signature changed. Function implementation and call arguments were not modified; run Verify.',
    ])
    expect(get(ExpressionVerificationStore.entries)[body.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[call.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[unaffected.id]).toBeDefined()
  })

  it('resets verification and reports a Signature Parameter position change', () => {
    const first = {
      parameterId: 'first-parameter', id: 'first',
      valueType: { type: 'string' as const }, nullable: false,
    }
    const second = {
      parameterId: 'second-parameter', id: 'second',
      valueType: { type: 'string' as const }, nullable: false,
    }
    const signature = node(3, {
      kind: 'signature-type', typeId: 'handler-signature', id: 'Handler',
      async: false, parameters: [first, second], returnType: null,
    })
    const action = node(8, {
      kind: 'action', comment: '', source: '$fn.handle("a", "b")',
    })
    const unaffected = node(9, {
      kind: 'action', comment: '', source: 'undefined',
    })
    const referFunction = node(5, {
      kind: 'function', id: 'handle',
      signature: { mode: 'refer', signatureTypeId: 'handler-signature' },
      implementation: { mode: 'procedure' },
    }, [node(6, { kind: 'function-procedure' })])
    const root = node(1, { kind: 'project' }, [
      signature,
      node(2, { kind: 'app', appId: 'app-uuid', id: 'app' }, [
        node(4, { kind: 'declares' }, [
          node(7, { kind: 'functions' }, [referFunction]),
        ]),
        action,
        unaffected,
      ]),
    ])
    ExpressionVerificationStore.setResult(action, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unaffected, { status: 'verified', messages: [] })
    const previousElement = signature.element as Extract<
      MebacoElement.Element,
      { kind: 'signature-type' }
    >

    const result = ElementUpdateTransaction.commit(root, signature.id, previousElement, {
      ...previousElement,
      parameters: [second, first],
    })

    expect((findNode(get(TreeStore.rootNode), action.id)?.element as { source: string }).source)
      .toBe('$fn.handle("a", "b")')
    expect(result.updatedOccurrenceCount).toBe(0)
    expect(result.verificationImpact).toEqual({ type: 'nodes', nodeIds: [action.id] })
    expect(result.verificationReset).toBe(true)
    expect(result.notices).toEqual([
      'Signature parameter order changed. Positional argument meaning may have changed; review call sites after Verify.',
    ])
    expect(get(ExpressionVerificationStore.entries)[action.id]).toBeUndefined()
    expect(get(ExpressionVerificationStore.entries)[unaffected.id]).toBeDefined()
  })

  it('updates statically resolved Object member expressions and resets verification after a rename', () => {
    const objectType = node(3, {
      kind: 'object-type', typeId: 'user-type', id: 'User', baseObjectIds: [],
      properties: [{
        propertyId: 'name-property', id: 'name', valueType: { type: 'string' },
        optional: false, nullable: false,
      }],
    })
    const state = node(5, {
      kind: 'state', id: 'user',
      valueType: { type: 'reference', objectTypeIds: ['user-type'] },
      nullable: false, initial: { type: 'default' },
    })
    const expression = node(8, {
      kind: 'action', comment: '',
      source: '$state.user.name + $state.user?.name + $state.user[\'name\']',
    })
    const root = node(1, { kind: 'project' }, [objectType, state, expression])
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    const previousElement = objectType.element as Extract<
      MebacoElement.Element,
      { kind: 'object-type' }
    >

    const result = ElementUpdateTransaction.commit(root, objectType.id, previousElement, {
      ...previousElement,
      properties: [{ ...previousElement.properties[0], id: 'displayName' }],
    })

    expect((findNode(get(TreeStore.rootNode), expression.id)?.element as { source: string }).source)
      .toBe('$state.user.displayName + $state.user?.displayName + $state.user[\'displayName\']')
    expect(result.updatedReferenceNodeIds).toEqual([expression.id])
    expect(result.updatedOccurrenceCount).toBe(3)
    expect(result.verificationImpact).toEqual({ type: 'all' })
    expect(result.notices).toEqual([
      'Object members changed: 1 renamed.',
      'Renamed: User.name -> User.displayName',
    ])
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })

  it('does not reset verification when only Object Property order changes', () => {
    const first = {
      propertyId: 'first-property', id: 'first', valueType: { type: 'string' as const },
      optional: false, nullable: false,
    }
    const second = {
      propertyId: 'second-property', id: 'second', valueType: { type: 'number' as const },
      optional: false, nullable: false,
    }
    const objectType = node(3, {
      kind: 'object-type', typeId: 'item-type', id: 'Item',
      baseObjectIds: [], properties: [first, second],
    })
    const expression = node(8, { kind: 'if', condition: 'true' })
    const root = node(1, { kind: 'project' }, [objectType, expression])
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    const previousElement = objectType.element as Extract<
      MebacoElement.Element,
      { kind: 'object-type' }
    >

    const result = ElementUpdateTransaction.commit(root, objectType.id, previousElement, {
      ...previousElement,
      properties: [second, first],
    })

    expect(result.verificationImpact).toEqual({ type: 'none' })
    expect(result.notices).toEqual([])
    expect(get(ExpressionVerificationStore.entries)[expression.id]).toBeDefined()
  })

  it('rejects Object Property name reuse before committing', () => {
    const objectType = node(3, {
      kind: 'object-type', typeId: 'item-type', id: 'Item', baseObjectIds: [],
      properties: [{
        propertyId: 'previous-property', id: 'value', valueType: { type: 'string' },
        optional: false, nullable: false,
      }],
    })
    const root = node(1, { kind: 'project' }, [objectType])
    const previousElement = objectType.element as Extract<
      MebacoElement.Element,
      { kind: 'object-type' }
    >

    expect(() => ElementUpdateTransaction.commit(root, objectType.id, previousElement, {
      ...previousElement,
      properties: [{
        ...previousElement.properties[0], propertyId: 'replacement-property',
      }],
    })).toThrow('cannot be assigned to a different Property identity')
    expect((findNode(root, objectType.id)?.element as typeof previousElement).properties[0].propertyId)
      .toBe('previous-property')
  })
})
