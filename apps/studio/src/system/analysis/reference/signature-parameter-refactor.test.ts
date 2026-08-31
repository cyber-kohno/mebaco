import { describe, expect, it } from 'vitest'
import type SignatureTypeElement from '../../element/kind/type/signature/signature-type-element'
import SignatureDefinition from '../../element/kind/type/signature/signature-definition'
import type TreeNode from '../../tree/tree-node'
import SignatureParameterRefactor from './signature-parameter-refactor'
import type FunctionElement from '../../element/kind/function/function-element'

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

const parameter = (
  parameterId: string,
  id: string,
): SignatureDefinition.Parameter => SignatureDefinition.createParameter(
  id,
  undefined,
  false,
  parameterId,
)

const signature = (
  parameters: SignatureDefinition.Parameter[],
): SignatureTypeElement.Element => ({
  kind: 'signature-type',
  typeId: 'signature-id',
  id: 'Handler',
  async: false,
  parameters,
  returnType: null,
})

const referFunction = (
  id: string,
  signatureTypeId: string,
): FunctionElement.Element => ({
  kind: 'function',
  id,
  signature: { mode: 'refer', signatureTypeId },
  implementation: { mode: 'procedure' },
})

const inlineFunction = (
  id: string,
  definition: SignatureDefinition.Definition,
  source: string,
): FunctionElement.Element => ({
  kind: 'function',
  id,
  signature: { mode: 'inline', definition },
  implementation: { mode: 'code', source },
})

describe('SignatureParameterRefactor', () => {
  it('renames $args references only inside Refer Functions using the Signature', () => {
    const previous = signature([parameter('first-id', 'first')])
    const current = signature([parameter('first-id', 'renamed')])
    const targetAction = node(6, {
      kind: 'action', comment: '', source: "$args.first + $args['first']",
    })
    const otherAction = node(10, {
      kind: 'action', comment: '', source: '$args.first',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous),
      node(3, referFunction('target', 'signature-id'), [
        node(4, { kind: 'function-procedure' }, [targetAction]),
      ]),
      node(7, referFunction('other', 'other-id'), [
        node(8, { kind: 'function-procedure' }, [otherAction]),
      ]),
    ])

    const result = SignatureParameterRefactor.apply(root, 2, previous, current)

    expect((result.rootNode.children[1].children[0].children[0].element as { source: string }).source)
      .toBe("$args.renamed + $args['renamed']")
    expect((result.rootNode.children[2].children[0].children[0].element as { source: string }).source)
      .toBe('$args.first')
    expect(result.changedNodeIds).toEqual([targetAction.id])
    expect(result.updatedOccurrenceCount).toBe(2)
    expect(result.orderChanged).toBe(false)
  })

  it('renames swapped Parameters simultaneously by stable identity', () => {
    const previous = signature([
      parameter('first-id', 'first'),
      parameter('second-id', 'second'),
    ])
    const current = signature([
      parameter('first-id', 'second'),
      parameter('second-id', 'first'),
    ])
    const action = node(6, {
      kind: 'action', comment: '', source: '$args.first + $args.second',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous),
      node(3, referFunction('target', 'signature-id'), [
        node(4, { kind: 'function-procedure' }, [action]),
      ]),
    ])

    const result = SignatureParameterRefactor.apply(root, 2, previous, current)

    expect((result.rootNode.children[1].children[0].children[0].element as { source: string }).source)
      .toBe('$args.second + $args.first')
    expect(result.updatedOccurrenceCount).toBe(2)
  })

  it('leaves removed Parameter references for Verify to detect', () => {
    const removed = parameter('removed-id', 'removed')
    const previous = signature([removed])
    const current = signature([])
    const action = node(6, {
      kind: 'action', comment: '', source: '$args.removed',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous),
      node(3, referFunction('target', 'signature-id'), [
        node(4, { kind: 'function-procedure' }, [action]),
      ]),
    ])

    const result = SignatureParameterRefactor.apply(root, 2, previous, current)

    expect((result.rootNode.children[1].children[0].children[0].element as { source: string }).source)
      .toBe('$args.removed')
    expect(result.updatedOccurrenceCount).toBe(0)
  })

  it('rejects reuse that would capture a removed Parameter reference', () => {
    const previous = signature([parameter('removed-id', 'value')])
    const current = signature([parameter('added-id', 'value')])
    const action = node(6, {
      kind: 'action', comment: '', source: '$args.value',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous),
      node(3, referFunction('target', 'signature-id'), [
        node(4, { kind: 'function-procedure' }, [action]),
      ]),
    ])

    expect(() => SignatureParameterRefactor.apply(root, 2, previous, current))
      .toThrow(SignatureParameterRefactor.ReferenceCaptureError)
  })

  it('reports positional changes caused by reorder, insertion, or removal', () => {
    const first = parameter('first-id', 'first')
    const second = parameter('second-id', 'second')
    const added = parameter('added-id', 'added')
    const root = node(1, { kind: 'project' })

    expect(SignatureParameterRefactor.apply(
      root, 1, signature([first, second]), signature([second, first]),
    ).orderChanged).toBe(true)
    expect(SignatureParameterRefactor.apply(
      root, 1, signature([first, second]), signature([added, first, second]),
    ).orderChanged).toBe(true)
    expect(SignatureParameterRefactor.apply(
      root, 1, signature([first, second]), signature([second]),
    ).orderChanged).toBe(true)
  })

  it('leaves owned Inline Function Code identifiers for Verify to detect', () => {
    const previous = inlineFunction(
      'calculate',
      SignatureDefinition.create(false, [parameter('value-id', 'value')]),
      'return value * 2',
    )
    const current = inlineFunction(
      'calculate',
      SignatureDefinition.create(false, [parameter('value-id', 'amount')]),
      'return value * 2',
    )
    const root = node(1, { kind: 'project' }, [node(2, previous)])

    const result = SignatureParameterRefactor.applyFunction(
      root,
      2,
      previous,
      current,
    )

    expect(result.element.implementation).toEqual({
      mode: 'code',
      source: 'return value * 2',
    })
    expect(result.updatedOccurrenceCount).toBe(0)
    expect(result.changedNodeIds).toEqual([])
  })

  it('does not rename $args references inside a nested Function scope', () => {
    const previousDefinition = SignatureDefinition.create(
      false,
      [parameter('outer-id', 'value')],
    )
    const currentDefinition = SignatureDefinition.create(
      false,
      [parameter('outer-id', 'amount')],
    )
    const previous: FunctionElement.Element = {
      kind: 'function', id: 'outer',
      signature: { mode: 'inline', definition: previousDefinition },
      implementation: { mode: 'procedure' },
    }
    const current: FunctionElement.Element = {
      ...previous,
      signature: { mode: 'inline', definition: currentDefinition },
    }
    const outerAction = node(4, {
      kind: 'action', comment: '', source: '$args.value',
    })
    const nestedAction = node(8, {
      kind: 'action', comment: '', source: '$args.value',
    })
    const nestedFunction: FunctionElement.Element = {
      kind: 'function', id: 'nested',
      signature: {
        mode: 'inline',
        definition: SignatureDefinition.create(false, [parameter('nested-id', 'value')]),
      },
      implementation: { mode: 'procedure' },
    }
    const root = node(1, { kind: 'project' }, [
      node(2, previous, [
        node(3, { kind: 'function-procedure' }, [
          outerAction,
          node(6, nestedFunction, [
            node(7, { kind: 'function-procedure' }, [nestedAction]),
          ]),
        ]),
      ]),
    ])

    const result = SignatureParameterRefactor.applyFunction(root, 2, previous, current)

    expect((result.rootNode.children[0].children[0].children[0].element as { source: string }).source)
      .toBe('$args.amount')
    expect((result.rootNode.children[0].children[0].children[1].children[0].children[0].element as { source: string }).source)
      .toBe('$args.value')
    expect(result.changedNodeIds).toEqual([outerAction.id])
  })
})
