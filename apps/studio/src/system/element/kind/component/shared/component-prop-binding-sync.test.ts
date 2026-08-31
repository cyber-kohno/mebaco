import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import ReferenceGraph from '../../../../analysis/reference/reference-graph'
import TreeStore from '../../../../store/tree-store'
import TreeNode from '../../../../tree/tree-node'
import TypeExpression from '../../type/type-expression'
import ValuePropElement from '../definition/value-prop-element'
import ComponentPropBindingSync from './component-prop-binding-sync'

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

const getNode = (nodeId: number): TreeNode.Node => {
  const found = TreeNode.findNode(get(TreeStore.rootNode), nodeId)
  if (found == null) throw new Error(`node-${nodeId} was not found.`)
  return found
}

const getBindings = (nodeId: number) => {
  const element = getNode(nodeId).element
  if (
    element.kind !== 'entry'
    && element.kind !== 'component-use'
    && element.kind !== 'slot-use'
  ) throw new Error(`node-${nodeId} has no Prop bindings.`)
  return element.propBindings
}

describe('Component Prop binding synchronization', () => {
  beforeEach(() => {
    TreeStore.replaceRoot(node(1, { kind: 'project' }, [
      node(2, { kind: 'component', componentId: 'component-id', id: 'Main' }, [
        node(3, { kind: 'props' }),
        node(4, { kind: 'if', condition: '$props.name.length > 0' }),
      ]),
      node(5, { kind: 'entry', componentId: 'component-id', propBindings: [] }),
      node(6, { kind: 'component-use', componentId: 'component-id', propBindings: [] }),
      node(7, { kind: 'entry', componentId: 'other-component', propBindings: [] }),
    ]))
  })

  it('adds defaults, replaces them after a type update, and removes only external bindings', () => {
    const prop = ValuePropElement.create(
      'name',
      TypeExpression.createPrimitive('string'),
      false,
      undefined,
      'prop-id',
    )
    TreeStore.addChild(3, prop)
    const propNode = getNode(3).children[0]

    expect(getBindings(5)).toEqual([{
      propId: 'prop-id',
      kind: 'value',
      source: { type: 'literal', value: '' },
    }])
    expect(getBindings(6)).toEqual(getBindings(5))
    expect(getBindings(7)).toEqual([])

    const objectProp = {
      ...prop,
      valueType: TypeExpression.createObject([
        TypeExpression.createProperty('age', TypeExpression.createPrimitive('number')),
      ]),
    }
    TreeStore.updateElement(propNode.id, objectProp)

    expect(getBindings(5)).toEqual([{
      propId: 'prop-id',
      kind: 'value',
      source: { type: 'formula', source: '{ "age": 0 }' },
    }])
    expect(getBindings(6)).toEqual(getBindings(5))

    TreeStore.removeNode(propNode.id)

    expect(getBindings(5)).toEqual([])
    expect(getBindings(6)).toEqual([])
    expect(getNode(4).element).toEqual({
      kind: 'if',
      condition: '$props.name.length > 0',
    })
  })

  it('uses Component defaults and fills a binding when that default is removed', () => {
    const prop = ValuePropElement.create(
      'name',
      TypeExpression.createPrimitive('string'),
      false,
      { type: 'literal', value: 'Component name' },
      'prop-id',
    )
    TreeStore.addChild(3, prop)
    const propNode = getNode(3).children[0]

    expect(getBindings(5)).toEqual([])
    TreeStore.updateElement(propNode.id, { ...prop, defaultValue: undefined })
    expect(getBindings(5)).toEqual([{
      propId: 'prop-id',
      kind: 'value',
      source: { type: 'literal', value: '' },
    }])
  })

  it('can remove external bindings without changing internal expression references', () => {
    const prop = ValuePropElement.create(
      'name',
      TypeExpression.createPrimitive('string'),
      false,
      undefined,
      'prop-id',
    )
    TreeStore.addChild(3, prop)
    const root = TreeNode.clone(get(TreeStore.rootNode))
    const propNode = root.children[0].children[0].children[0]

    ComponentPropBindingSync.remove(root, propNode.id, prop.propId)
    const references = ReferenceGraph.build(root, propNode.id).references

    expect(references.some((reference) => reference.sourceType === 'structural')).toBe(false)
    expect(references).toContainEqual(expect.objectContaining({
      sourceNodeId: 4,
      sourceType: 'expression',
    }))
    expect(TreeNode.findNode(root, 4)?.element).toEqual({
      kind: 'if',
      condition: '$props.name.length > 0',
    })
  })

  it('synchronizes Slot Prop bindings independently', () => {
    const slot = node(8, { kind: 'slot', slotId: 'slot-id', id: 'content' }, [
      node(9, { kind: 'props' }),
    ])
    const slotUse = node(10, { kind: 'slot-use', slotId: 'slot-id', propBindings: [] })
    const nextRoot = TreeNode.clone(get(TreeStore.rootNode))
    nextRoot.children.push(slot, slotUse)
    TreeStore.replaceRoot(nextRoot)

    TreeStore.addChild(9, ValuePropElement.create(
      'count',
      TypeExpression.createPrimitive('number'),
      false,
      undefined,
      'slot-prop-id',
    ))

    expect(getBindings(10)).toEqual([{
      propId: 'slot-prop-id',
      kind: 'value',
      source: { type: 'literal', value: '0' },
    }])
    expect(getBindings(5)).toEqual([])
  })
})
