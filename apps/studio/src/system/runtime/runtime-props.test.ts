import { describe, expect, it } from 'vitest'
import type TreeNode from '../tree/tree-node'
import FormulaContext from './formula/formula-context'
import RuntimeProps from './runtime-props'
import type RuntimeTree from './runtime-tree'
import type ValuePropElement from '../element/kind/component/definition/value-prop-element'

const componentNode = {
  id: 4,
  element: { kind: 'component', componentId: 'sample-id', id: 'Sample' },
  isOpen: true,
  children: [{
    id: 5,
    element: { kind: 'props' },
    isOpen: true,
    children: [
      {
        id: 6,
        element: {
          kind: 'value-prop',
          propId: 'title-id',
          id: 'title',
          valueType: { type: 'string' },
          nullable: false,
          defaultValue: { type: 'literal', value: 'default title' },
        },
        isOpen: true,
        children: [],
      },
      {
        id: 7,
        element: {
          kind: 'value-prop',
          propId: 'count-id',
          id: 'count',
          valueType: { type: 'number' },
          nullable: false,
        },
        isOpen: true,
        children: [],
      },
    ],
  }],
} as TreeNode.Node

const entryNode = {
  id: 3,
  element: {
    kind: 'entry',
    componentId: 'sample-id',
    propBindings: [{
      propId: 'count-id',
      kind: 'value',
      source: { type: 'formula', source: '$state.base + 1' },
    }],
  },
  isOpen: true,
  children: [],
} as TreeNode.Node

describe('RuntimeProps', () => {
  it('combines Component defaults and explicit Entry bindings', () => {
    const projectNode = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    } as TreeNode.Node
    const runtime = {
      projectNode,
      appNode: projectNode,
      entryNode,
      stateNodes: [],
      componentNodes: [componentNode],
      styleNodes: [],
    } satisfies RuntimeTree.AppRuntime

    const result = RuntimeProps.resolveEntry(
      runtime,
      componentNode,
      FormulaContext.create({ $state: { base: 2 } }),
    )

    expect(result.errors).toEqual([])
    expect(result.values).toEqual({ title: 'default title', count: 3 })
  })

  it('resolves explicit ComponentUse bindings with the caller context', () => {
    const projectNode = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    } as TreeNode.Node

    const result = RuntimeProps.resolveBindings(
      componentNode,
      [{
        propId: 'count-id',
        kind: 'value',
        source: { type: 'formula', source: '$var.offset + 2' },
      }],
      FormulaContext.create({ $var: { offset: 5 } }),
      projectNode,
    )

    expect(result.errors).toEqual([])
    expect(result.values).toEqual({ title: 'default title', count: 7 })
  })

  it('resolves a Signature Type default as a no-op function', () => {
    const projectNode = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [{
        id: 2,
        element: {
          kind: 'signature-type',
          typeId: 'end-process-type',
          id: 'EndProcess',
          async: false,
          parameters: [],
          returnType: null,
        },
        isOpen: true,
        children: [],
      }],
    } as TreeNode.Node
    const prop: ValuePropElement.Element = {
      kind: 'value-prop',
      propId: 'end-process-prop',
      id: 'endProcess',
      valueType: {
        type: 'named',
        namedTypeId: 'end-process-type',
        namedTypeKind: 'signature',
      },
      nullable: false,
      defaultValue: { type: 'default' },
    }

    const result = RuntimeProps.resolveBindingsForProps(
      [prop],
      [],
      FormulaContext.createEmpty(),
      projectNode,
    )

    expect(result.errors).toEqual([])
    expect(result.values.endProcess).toBeTypeOf('function')
    expect((result.values.endProcess as () => unknown)()).toBeUndefined()
  })
})
