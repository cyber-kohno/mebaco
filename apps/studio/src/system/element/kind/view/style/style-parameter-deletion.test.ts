import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReferenceGraph from '../../../../analysis/reference/reference-graph'
import ElementDeletionController from '../../../deletion/element-deletion-controller'
import TreeStore from '../../../../store/tree-store'
import TreeNode from '../../../../tree/tree-node'
import StyleElement from './style-element'
import StyleParamElement from './style-param-element'
import StyleParameterDeletion from './style-parameter-deletion'

vi.mock('../../../../store/tree-store', () => ({
  default: {
    removeNode: vi.fn(),
  },
}))

vi.mock('../../../deletion/element-deletion-controller', () => ({
  default: {
    requestDelete: vi.fn(() => Promise.resolve(true)),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('Style Parameter deletion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not count expressions removed with UUID arguments', () => {
    const parameter = node(4, StyleParamElement.create(
      'accent',
      'color',
      undefined,
      'accent-parameter',
    ))
    const baseStyle = node(2, StyleElement.create('base', [{
      type: 'declaration',
      property: 'color',
      value: { type: 'formula', source: '$param.accent' },
    }], [], 'base-style'), [
      node(3, { kind: 'style-params' }, [parameter]),
    ])
    const derivedStyle = node(5, StyleElement.create('derived', [], [{
      referenceId: 'base-reference',
      styleId: 'base-style',
      arguments: [
        {
          parameterId: 'accent-parameter',
          binding: {
            type: 'value',
            value: { type: 'formula', source: '$param.accent + "removed"' },
          },
        },
      ],
    }], 'derived-style'))
    const delegatedStyle = node(6, StyleElement.create('delegated', [{
      type: 'declaration',
      property: 'background-color',
      value: { type: 'formula', source: '$param.accent' },
    }], [{
      referenceId: 'delegated-base-reference',
      styleId: 'base-style',
      arguments: [{
        parameterId: 'accent-parameter',
        binding: { type: 'delegate' },
      }],
    }], 'delegated-style'))
    const root = node(1, { kind: 'project' }, [baseStyle, derivedStyle, delegatedStyle])

    StyleParameterDeletion.request(
      root,
      parameter,
      [parameter],
      "Style Parameter 'accent'",
    )

    const request = vi.mocked(ElementDeletionController.requestDelete).mock.calls[0]?.[0]
    if (request == null) throw new Error('Deletion request was not made.')
    const cleanedDerived = TreeNode.findNode(request.rootNode, derivedStyle.id)
    if (cleanedDerived?.element.kind !== 'style') throw new Error('Derived Style was not found.')
    expect(cleanedDerived.element.bases[0]?.arguments).toEqual([{
      parameterId: 'accent-parameter',
      binding: {
        type: 'value',
        value: { type: 'literal', value: '#000' },
      },
    }])
    const cleanedDelegated = TreeNode.findNode(request.rootNode, delegatedStyle.id)
    if (cleanedDelegated?.element.kind !== 'style') throw new Error('Delegated Style was not found.')
    expect(cleanedDelegated.element.bases[0]?.arguments).toEqual([{
      parameterId: 'accent-parameter',
      binding: { type: 'delegate' },
    }])
    expect(ReferenceGraph.build(request.rootNode, parameter.id).references
      .filter((reference) => reference.sourceType === 'expression')
      .map((reference) => reference.sourceNodeId))
      .toEqual([baseStyle.id, delegatedStyle.id])
    expect(request.policy).toEqual({
      label: "Style Parameter 'accent'",
      structuralReferences: 'ignore',
      expressionReferences: 'confirm',
    })

    request.deleteNode()
    expect(TreeStore.removeNode).toHaveBeenCalledWith(parameter.id)
  })
})
