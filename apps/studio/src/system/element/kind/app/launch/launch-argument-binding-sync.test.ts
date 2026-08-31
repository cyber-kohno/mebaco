import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import TreeStore from '../../../../store/tree-store'
import TreeNode from '../../../../tree/tree-node'
import TypeExpression from '../../type/type-expression'
import LaunchArgumentElement from './launch-argument-element'
import ExpressionVerificationStore from '../../../../validation/expression/expression-verification-store'

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

const getBindings = (nodeId: number) => {
  const element = TreeNode.findNode(get(TreeStore.rootNode), nodeId)?.element
  if (element?.kind !== 'launcher' && element?.kind !== 'transition') {
    throw new Error(`node-${nodeId} has no Launch Argument bindings.`)
  }
  return element.argumentBindings
}

describe('Launch Argument binding synchronization', () => {
  beforeEach(() => {
    ExpressionVerificationStore.clear()
    TreeStore.replaceRoot(node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'target-app-uuid', id: 'target-app' }, [
        node(3, { kind: 'launch-options' }, [
          node(4, { kind: 'launch-arguments' }),
        ]),
      ]),
      node(5, {
        kind: 'launcher',
        launcherId: 'launcher-uuid',
        id: 'target-test',
        name: 'Target Test',
        appId: 'target-app-uuid',
        argumentBindings: [],
      }),
      node(6, {
        kind: 'transition',
        appId: 'target-app-uuid',
        argumentBindings: [],
      }),
      node(7, {
        kind: 'launcher',
        launcherId: 'other-launcher-uuid',
        id: 'other',
        name: 'Other',
        appId: 'other-app-uuid',
        argumentBindings: [],
      }),
      node(8, { kind: 'action', comment: '', source: '1 + 1' }),
    ]))
  })

  it('adds, updates, and removes required bindings from Launchers and Transitions', () => {
    const argument = {
      ...LaunchArgumentElement.create('count', 'count-prop-uuid'),
      valueType: TypeExpression.createPrimitive('number'),
    }
    TreeStore.addChild(4, argument)
    const argumentNode = TreeNode.findNode(get(TreeStore.rootNode), 4)?.children[0]
    if (argumentNode == null) throw new Error('Launch Argument was not created.')

    expect(getBindings(5)).toEqual([{
      propId: 'count-prop-uuid',
      kind: 'value',
      source: { type: 'literal', value: '0' },
    }])
    expect(getBindings(6)).toEqual(getBindings(5))
    expect(getBindings(7)).toEqual([])

    TreeStore.updateElement(argumentNode.id, {
      ...argument,
      valueType: TypeExpression.createObject([
        TypeExpression.createProperty('value', TypeExpression.createPrimitive('number')),
      ]),
    })
    expect(getBindings(5)).toEqual([{
      propId: 'count-prop-uuid',
      kind: 'value',
      source: { type: 'formula', source: '{ "value": 0 }' },
    }])

    TreeStore.removeNode(argumentNode.id)
    expect(getBindings(5)).toEqual([])
    expect(getBindings(6)).toEqual([])
  })

  it('omits optional bindings and adds one when an explicit default is removed', () => {
    const nullable = {
      ...LaunchArgumentElement.create('filter', 'filter-prop-uuid'),
      valueType: TypeExpression.createObject([]),
      nullable: true,
    }
    TreeStore.addChild(4, nullable)
    expect(getBindings(5)).toEqual([])

    const defaulted = {
      ...LaunchArgumentElement.create('mode', 'mode-prop-uuid'),
      valueType: TypeExpression.createPrimitive('string'),
      defaultValue: { type: 'literal' as const, value: 'test' },
    }
    TreeStore.addChild(4, defaulted)
    const argumentNode = TreeNode.findNode(get(TreeStore.rootNode), 4)?.children
      .find((child) => child.element.kind === 'launch-argument' && child.element.propId === 'mode-prop-uuid')
    if (argumentNode == null) throw new Error('Launch Argument was not created.')
    expect(getBindings(5)).toEqual([])

    TreeStore.updateElement(argumentNode.id, { ...defaulted, defaultValue: undefined })
    expect(getBindings(5)).toEqual([{
      propId: 'mode-prop-uuid',
      kind: 'value',
      source: { type: 'literal', value: '' },
    }])

    TreeStore.updateElement(argumentNode.id, defaulted)
    expect(getBindings(5)).toEqual([])
  })

  it('resets expression verification when the launch contract changes', () => {
    const expression = TreeNode.findNode(get(TreeStore.rootNode), 8)
    if (expression == null) throw new Error('Expression node was not found.')
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })

    const argument = {
      ...LaunchArgumentElement.create('count', 'count-prop-uuid'),
      valueType: TypeExpression.createPrimitive('number'),
    }
    TreeStore.addChild(4, argument)
    expect(get(ExpressionVerificationStore.entries)).toEqual({})

    const argumentNode = TreeNode.findNode(get(TreeStore.rootNode), 4)?.children[0]
    if (argumentNode == null) throw new Error('Launch Argument was not created.')
    ExpressionVerificationStore.setResult(expression, { status: 'verified', messages: [] })
    TreeStore.updateElement(argumentNode.id, {
      ...argument,
      valueType: TypeExpression.createPrimitive('string'),
    })
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })
})
