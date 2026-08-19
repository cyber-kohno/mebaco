import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element'
import type TreeNode from '../../../tree/tree-node'
import FunctionScope from './function-scope'

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

const fn = (id: string, children: TreeNode.Node[] = []) => node({
  kind: 'function', id, async: false, returnType: null,
}, children)

const args = (...ids: string[]) => node({ kind: 'function-arguments' }, ids.map((id) => (
  node({ kind: 'function-argument', id, valueType: { type: 'string' }, nullable: false })
)))

const procedure = (...children: TreeNode.Node[]) => node(
  { kind: 'function-procedure' },
  children,
)

const project = (
  globalFunctions: TreeNode.Node[],
  appChildren: TreeNode.Node[],
) => node({ kind: 'project' }, [
  node({ kind: 'common' }, [
    node({ kind: 'declares' }, [node({ kind: 'functions' })]),
  ]),
  node({ kind: 'apps' }, [
    node({ kind: 'app', id: 'app' }, [
      node({ kind: 'declares' }, [node({ kind: 'functions' }, globalFunctions)]),
      ...appChildren,
    ]),
  ]),
])

describe('FunctionScope', () => {
  it('resolves global, Retention, and nested Functions with inner shadowing', () => {
    nextNodeId = 1
    const global = fn('calculate')
    const retentionFunction = fn('calculate')
    const nested = fn('calculate', [args(), procedure()])
    const action = node({ kind: 'action', comment: '', source: '' })
    const outer = fn('outer', [args(), procedure(nested, action)])
    const retention = node({ kind: 'retention' }, [retentionFunction, outer])
    const root = project([global], [retention])

    expect(FunctionScope.resolveFunction(root, action.id, 'calculate')?.node.id)
      .toBe(nested.id)
  })

  it('makes Retention Functions visible to the associated content descendants', () => {
    nextNodeId = 1
    const local = fn('format')
    const action = node({ kind: 'action', comment: '', source: '' })
    const host = node({ kind: 'component', id: 'Panel' }, [
      node({ kind: 'retention' }, [local]),
      node({ kind: 'elements' }, [action]),
    ])
    const root = project([], [host])

    expect(FunctionScope.resolveFunction(root, action.id, 'format')?.node.id)
      .toBe(local.id)
  })

  it('does not leak a Function from an unrelated Retention', () => {
    nextNodeId = 1
    const local = fn('privateFunction')
    const target = node({ kind: 'action', comment: '', source: '' })
    const root = project([], [
      node({ kind: 'retention' }, [local]),
      node({ kind: 'retention' }, [target]),
    ])

    expect(FunctionScope.resolveFunction(root, target.id, 'privateFunction')).toBeNull()
  })

  it('finds the owner Function and its Arguments', () => {
    nextNodeId = 1
    const action = node({ kind: 'action', comment: '', source: '' })
    const owner = fn('save', [args('user', 'notify'), procedure(action)])
    const root = project([owner], [])

    expect(FunctionScope.findOwnerFunction(root, action.id)?.element.id).toBe('save')
    expect(FunctionScope.getArguments(owner).map((argument) => argument.id))
      .toEqual(['user', 'notify'])
  })

  it('reports duplicate Function, Argument, and Variable ids in one frame', () => {
    nextNodeId = 1
    const duplicateFunction = fn('inner')
    const duplicateArgument = args('value', 'value')
    const duplicateVariable = node({
      kind: 'variable', id: 'result', binding: 'let', typeSetting: { type: 'inferred' }, source: '0',
    })
    const owner = fn('owner', [
      duplicateArgument,
      procedure(
        fn('inner'),
        node({ kind: 'block', label: '' }, [duplicateFunction]),
        node({
          kind: 'variable', id: 'result', binding: 'let', typeSetting: { type: 'inferred' }, source: '0',
        }),
        node({ kind: 'block', label: '' }, [duplicateVariable]),
      ),
    ])
    const root = project([owner], [])

    expect(FunctionScope.validateDeclarations(root).map((issue) => issue.message))
      .toEqual([
        "Argument 'value' is already declared in this scope.",
        "Function 'inner' is already declared in this scope.",
        "Variable 'result' is already declared in this scope.",
      ])
  })
})
