import { describe, expect, it } from 'vitest'
import type MebacoElement from '@system/model/element/element'
import TypeExpression from '@system/model/type-system/type-expression'
import type TreeNode from '@system/model/tree/tree-node'
import RuntimeState from './runtime-state'
import RuntimeStateDependency from './runtime-state-dependency'
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

  it('exposes constants to State initializers', () => {
    const projectNode = node({ kind: 'project' })
    const appNode = node({ kind: 'app', appId: 'app-id', id: 'app' })
    const stateNode = node({
      kind: 'state',
      id: 'cells',
      valueType: TypeExpression.wrapArray(TypeExpression.createPrimitive('number'), 1),
      nullable: false,
      initial: {
        type: 'formula',
        source: 'Array.from({ length: $const.divisions }, (_, index) => index)',
      },
    })
    const runtime: RuntimeTree.AppRuntime = {
      projectNode,
      appNode,
      entryNode: null,
      stateNodes: [stateNode],
      componentNodes: [],
      styleNodes: [],
    }

    expect(RuntimeState.createState(runtime, {}, { divisions: 4 }))
      .toEqual({ cells: [0, 1, 2, 3] })
  })

  it('tracks top-level State reads and writes without tracking deep mutation', () => {
    const projectNode = node({ kind: 'project' })
    const appNode = node({ kind: 'app', appId: 'app-id', id: 'app' })
    const titleNode = node({
      kind: 'state',
      id: 'title',
      valueType: TypeExpression.createPrimitive('string'),
      nullable: false,
      initial: { type: 'literal', value: 'first' },
    })
    const taskNode = node({
      kind: 'state',
      id: 'task',
      valueType: TypeExpression.createObject([
        TypeExpression.createProperty('title', TypeExpression.createPrimitive('string')),
      ]),
      nullable: false,
      initial: { type: 'default' },
    })
    const runtime: RuntimeTree.AppRuntime = {
      projectNode,
      appNode,
      entryNode: null,
      stateNodes: [titleNode, taskNode],
      componentNodes: [],
      styleNodes: [],
    }
    const writes: RuntimeStateDependency.Dependency[][] = []
    const state = RuntimeState.createState(runtime, {}, {}, {
      onWrite: (dependencies) => writes.push([...dependencies]),
    })
    const tracked = RuntimeStateDependency.track(() => state.title)
    const titleDependency = tracked.dependencies[0]

    expect(writes).toEqual([])
    expect(tracked.value).toBe('first')
    expect(titleDependency).toBeTypeOf('string')

    state.title = 'second'
    expect(writes.flat()).toContain(titleDependency)

    writes.length = 0
    const trackedTask = RuntimeStateDependency.track(
      () => (state.task as { title: string }).title,
    )
    const taskDependency = trackedTask.dependencies[0]
    ;(state.task as { title: string }).title = 'changed'
    expect(writes).toEqual([])

    state.task = { ...(state.task as object) }
    expect(writes.flat()).toContain(taskDependency)
  })

  it('forwards inherited State writes through nested component layers', () => {
    const projectNode = node({ kind: 'project' })
    const appNode = node({ kind: 'app', appId: 'app-id', id: 'app' })
    const objectNode = node({
      kind: 'state',
      id: 'obj',
      valueType: TypeExpression.createObject([
        TypeExpression.createProperty('text', TypeExpression.createPrimitive('string')),
      ]),
      nullable: false,
      initial: { type: 'literal', value: '{"text":"first"}' },
    })
    const runtime: RuntimeTree.AppRuntime = {
      projectNode,
      appNode,
      entryNode: null,
      stateNodes: [objectNode],
      componentNodes: [],
      styleNodes: [],
    }
    const writes: RuntimeStateDependency.Dependency[][] = []
    const appState = RuntimeState.createState(runtime, {}, {}, {
      onWrite: (dependencies) => writes.push([...dependencies]),
    })
    const parentState = RuntimeState.createComponentState(
      projectNode,
      appState,
      [],
      {},
      {},
      { onWrite: (dependencies) => writes.push([...dependencies]) },
    )
    const childState = RuntimeState.createComponentState(
      projectNode,
      parentState,
      [],
      {},
      {},
      { onWrite: (dependencies) => writes.push([...dependencies]) },
    )
    const parentRead = RuntimeStateDependency.track(
      () => (parentState.obj as { text: string }).text,
    )
    const childRead = RuntimeStateDependency.track(
      () => (childState.obj as { text: string }).text,
    )

    ;(childState.obj as { text: string }).text = 'changed'
    childState.obj = { ...(childState.obj as object) }

    expect(parentRead.dependencies).toEqual(childRead.dependencies)
    expect(writes.flat()).toContain(parentRead.dependencies[0])
    expect((appState.obj as { text: string }).text).toBe('changed')
    expect((parentState.obj as { text: string }).text).toBe('changed')
  })
})
