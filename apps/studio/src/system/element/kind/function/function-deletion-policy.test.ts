import { describe, expect, it } from 'vitest'
import ReferenceGraph from '../../../analysis/reference/reference-graph'
import type TreeNode from '../../../tree/tree-node'
import FunctionDeletionPolicy from './function-deletion-policy'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const functions = (
  managerNodeId: number,
  functionNodes: readonly TreeNode.Node[],
): TreeNode.Node => node(managerNodeId - 1, { kind: 'declares' }, [
  node(managerNodeId, { kind: 'functions' }, [...functionNodes]),
])

const functionElement = (id: string): FunctionDeletionPolicy.FunctionNode['element'] => ({
  kind: 'function',
  id,
  signature: {
    mode: 'inline',
    definition: { async: false, parameters: [], returnType: null },
  },
  implementation: { mode: 'code', source: 'return undefined' },
})

describe('FunctionDeletionPolicy', () => {
  it('detects calls that would rebind from an App Function to a Common Function', () => {
    const commonFunction = node(5, functionElement('save'))
    const appFunction = node(13, functionElement('save')) as FunctionDeletionPolicy.FunctionNode
    const call = node(14, { kind: 'action', comment: '', source: '$fn.save()' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'common' }, [functions(4, [commonFunction])]),
      node(10, { kind: 'app', appId: 'app-id', id: 'app' }, [
        functions(12, [appFunction]),
        call,
      ]),
    ])
    const references = ReferenceGraph.build(root, appFunction.id).references

    expect(FunctionDeletionPolicy.collectRebindings(root, appFunction, references)).toEqual([
      {
        reference: expect.objectContaining({ sourceNodeId: call.id }),
        replacementNodeId: commonFunction.id,
      },
    ])
    expect(FunctionDeletionPolicy.createRebindingBlock(
      root,
      appFunction,
      references,
    )).toEqual({
      title: 'Cannot Delete Function',
      message: [
        'Deleting this Function would redirect calls in 1 element to another Function with the same Id.',
        'node-14: action#source -> node-5: function.save',
        'Change the references before deleting this Function.',
      ],
    })
  })

  it('does not treat a same-named Function in another App as a fallback target', () => {
    const firstFunction = node(5, functionElement('run')) as FunctionDeletionPolicy.FunctionNode
    const secondFunction = node(15, functionElement('run'))
    const call = node(8, { kind: 'action', comment: '', source: '$fn.run()' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'first-id', id: 'first' }, [
        functions(4, [firstFunction]),
        call,
      ]),
      node(12, { kind: 'app', appId: 'second-id', id: 'second' }, [
        functions(14, [secondFunction]),
      ]),
    ])
    const references = ReferenceGraph.build(root, firstFunction.id).references

    expect(FunctionDeletionPolicy.collectRebindings(root, firstFunction, references)).toEqual([])
  })
})
