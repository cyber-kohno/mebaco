import { describe, expect, it } from 'vitest'
import type MebacoElement from '../element/element'
import TypeExpression from '../element/kind/type/type-expression'
import type TreeNode from '../tree/tree-node'
import RuntimeState from './runtime-state'
import type RuntimeTree from './runtime-tree'

let nextNodeId = 1

const node = (
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id: nextNodeId++,
  element,
  isOpen: true,
  children,
})

describe('RuntimeState', () => {
  it('initializes nullable Object states with null', () => {
    const projectNode = node({ kind: 'project' })
    const appNode = node({ kind: 'app', appId: 'app-id', id: 'app' })
    const stateNode = node({
      kind: 'state',
      id: 'selectedUser',
      valueType: TypeExpression.createReference(['user-type']),
      nullable: true,
      initial: { type: 'default' },
    })
    const runtime: RuntimeTree.AppRuntime = {
      projectNode,
      appNode,
      entryNode: null,
      stateNodes: [stateNode],
      componentNodes: [],
      styleNodes: [],
    }

    expect(RuntimeState.createState(runtime)).toEqual({ selectedUser: null })
  })

  it('creates a component-local state layer over its parent state', () => {
    const projectNode = node({ kind: 'project' })
    const parentState = { shared: 1 }
    const stateNode = node({
      kind: 'state',
      id: 'localCount',
      valueType: TypeExpression.createPrimitive('number'),
      nullable: false,
      initial: { type: 'literal', value: '2' },
    })

    const localState = RuntimeState.createComponentState(
      projectNode,
      parentState,
      [stateNode],
    )

    expect(localState.localCount).toBe(2)
    expect(localState.shared).toBe(1)
    localState.shared = 3
    expect(parentState.shared).toBe(3)
  })
})
