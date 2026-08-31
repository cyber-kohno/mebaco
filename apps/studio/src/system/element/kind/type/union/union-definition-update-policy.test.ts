import { describe, expect, it } from 'vitest'
import type TreeNode from '../../../../tree/tree-node'
import UnionDefinitionUpdatePolicy from './union-definition-update-policy'
import type UnionTypeElement from './union-type-element'

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

const union = (
  definition: UnionTypeElement.Element['definition'],
): UnionTypeElement.Element => ({
  kind: 'union-type',
  typeId: 'status-type',
  id: 'Status',
  definition,
})

const literal = (
  values: string[],
): UnionTypeElement.Element => union({
  type: 'literal',
  valueType: 'string',
  values,
})

const namedStatus = { type: 'named' as const, namedTypeId: 'status-type' }

describe('UnionDefinitionUpdatePolicy', () => {
  it('allows adding literals and removing unused literals', () => {
    const unionNode = node(2, literal(['ready', 'done']))
    const state = node(3, {
      kind: 'state', id: 'status', valueType: namedStatus,
      nullable: false, initial: { type: 'literal', value: 'ready' },
    })
    const root = node(1, { kind: 'project' }, [unionNode, state])

    expect(UnionDefinitionUpdatePolicy.collectConflicts(
      root, unionNode.id, unionNode.element as UnionTypeElement.Element,
      literal(['ready', 'done', 'failed']),
    )).toEqual([])
    expect(UnionDefinitionUpdatePolicy.collectConflicts(
      root, unionNode.id, unionNode.element as UnionTypeElement.Element,
      literal(['ready']),
    )).toEqual([])
  })

  it('blocks removing literal defaults and initial values that are still stored', () => {
    const unionNode = node(2, literal(['ready', 'done']))
    const state = node(3, {
      kind: 'state', id: 'status', valueType: namedStatus,
      nullable: false, initial: { type: 'literal', value: 'done' },
    })
    const prop = node(4, {
      kind: 'value-prop', propId: 'prop-id', id: 'status', valueType: namedStatus,
      nullable: false, defaultValue: { type: 'literal', value: 'done' },
    })
    const argument = node(5, {
      kind: 'launch-argument', propId: 'argument-id', id: 'status', valueType: namedStatus,
      nullable: false, defaultValue: { type: 'literal', value: 'done' },
    })
    const root = node(1, { kind: 'project' }, [unionNode, state, prop, argument])

    expect(UnionDefinitionUpdatePolicy.collectConflicts(
      root, unionNode.id, unionNode.element as UnionTypeElement.Element,
      literal(['ready']),
    )).toEqual([
      { nodeId: 3, sourceLabel: 'state#initial', detail: "'done'" },
      { nodeId: 4, sourceLabel: 'value-prop#defaultValue', detail: "'done'" },
      { nodeId: 5, sourceLabel: 'launch-argument#defaultValue', detail: "'done'" },
    ])
  })

  it('blocks Case values removed from a referenced Literal Union', () => {
    const unionNode = node(2, literal(['ready', 'done']))
    const switchNode = node(3, {
      kind: 'switch',
      valueType: { type: 'union', unionTypeId: 'status-type' },
      source: '$state.status',
    }, [
      node(4, { kind: 'case', value: { type: 'string', value: 'ready' } }),
      node(5, { kind: 'case', value: { type: 'string', value: 'done' } }),
    ])
    const root = node(1, { kind: 'project' }, [unionNode, switchNode])

    expect(UnionDefinitionUpdatePolicy.collectConflicts(
      root, unionNode.id, unionNode.element as UnionTypeElement.Element,
      literal(['ready']),
    )).toEqual([
      { nodeId: 5, sourceLabel: 'case#value', detail: "'done'" },
    ])
  })

  it('blocks changing the literal primitive when a saved literal exists', () => {
    const previous = union({ type: 'literal', valueType: 'number', values: [1] })
    const unionNode = node(2, previous)
    const state = node(3, {
      kind: 'state', id: 'status', valueType: namedStatus,
      nullable: false, initial: { type: 'literal', value: '1' },
    })
    const root = node(1, { kind: 'project' }, [unionNode, state])

    expect(UnionDefinitionUpdatePolicy.collectConflicts(
      root,
      unionNode.id,
      previous,
      union({ type: 'literal', valueType: 'string', values: ['1'] }),
    )).toEqual([
      { nodeId: 3, sourceLabel: 'state#initial', detail: '1' },
    ])
  })

  it('blocks changing a referenced Literal Union to an Object Union only when saved data becomes invalid', () => {
    const unionNode = node(2, literal(['ready']))
    const defaultState = node(3, {
      kind: 'state', id: 'status', valueType: namedStatus,
      nullable: false, initial: { type: 'default' },
    })
    const switchNode = node(4, {
      kind: 'control-switch',
      valueType: { type: 'union', unionTypeId: 'status-type' },
      source: '$state.status',
    })
    const objectUnion = union({ type: 'object', objectTypeIds: ['result-object'] })

    expect(UnionDefinitionUpdatePolicy.collectConflicts(
      node(1, { kind: 'project' }, [unionNode, defaultState]),
      unionNode.id,
      unionNode.element as UnionTypeElement.Element,
      objectUnion,
    )).toEqual([])
    expect(UnionDefinitionUpdatePolicy.collectConflicts(
      node(1, { kind: 'project' }, [unionNode, defaultState, switchNode]),
      unionNode.id,
      unionNode.element as UnionTypeElement.Element,
      objectUnion,
    )).toEqual([
      { nodeId: 4, sourceLabel: 'control-switch#valueType' },
    ])
  })

  it('allows removing an Object from an Object Union and leaves code safety to Verify', () => {
    const previous = union({ type: 'object', objectTypeIds: ['success', 'failure'] })
    const unionNode = node(2, previous)
    const state = node(3, {
      kind: 'state', id: 'result', valueType: namedStatus,
      nullable: false, initial: { type: 'default' },
    })
    const root = node(1, { kind: 'project' }, [unionNode, state])

    expect(UnionDefinitionUpdatePolicy.collectConflicts(
      root,
      unionNode.id,
      previous,
      union({ type: 'object', objectTypeIds: ['success'] }),
    )).toEqual([])
  })
})
