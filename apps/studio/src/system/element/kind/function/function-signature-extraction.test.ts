import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))
import type TreeNode from '../../../tree/tree-node'
import SignatureDefinition from '../type/signature/signature-definition'
import TypeExpression from '../type/type-expression'
import FunctionSignatureExtraction from './function-signature-extraction'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const commonProject = (
  types: TreeNode.Node,
  functionNode: TreeNode.Node,
): TreeNode.Node => node(1, { kind: 'project' }, [
  node(2, { kind: 'common' }, [
    node(3, { kind: 'declares' }, [
      types,
      node(5, { kind: 'functions' }, [functionNode]),
    ]),
  ]),
])

describe('FunctionSignatureExtraction', () => {
  it('atomically creates a Signature Type and changes the Function to Refer', () => {
    const definition = SignatureDefinition.create(false, [
      SignatureDefinition.createParameter(
        'value',
        TypeExpression.createPrimitive('number'),
        false,
        'value-parameter',
      ),
    ], {
      valueType: TypeExpression.createPrimitive('number'),
      nullable: false,
    })
    const functionNode = node(6, {
      kind: 'function', id: 'calculate',
      signature: { mode: 'inline', definition },
      implementation: { mode: 'code', source: 'return value * 2' },
    })
    const types = node(4, { kind: 'types' })
    const root = commonProject(types, functionNode)

    const plan = FunctionSignatureExtraction.plan(
      root,
      functionNode.id,
      types.id,
      'CalculateSignature',
    )

    const extracted = plan.rootNode.children[0].children[0].children[0].children[0]
    expect(extracted.element).toMatchObject({
      kind: 'signature-type',
      id: 'CalculateSignature',
      parameters: definition.parameters,
      returnType: definition.returnType,
    })
    if (extracted.element.kind !== 'signature-type') throw new Error('Expected Signature Type.')
    const updatedFunction = plan.rootNode.children[0].children[0].children[1].children[0]
    expect(updatedFunction.element).toMatchObject({
      kind: 'function',
      id: 'calculate',
      signature: {
        mode: 'refer',
        signatureTypeId: extracted.element.typeId,
      },
      implementation: { mode: 'code', source: 'return value * 2' },
    })
    expect(functionNode.element).toMatchObject({
      signature: { mode: 'inline', definition },
    })
  })

  it('offers only destinations where the Signature and its referenced types stay visible', () => {
    const procedure = node(7, { kind: 'function-procedure' })
    const functionNode = node(6, {
      kind: 'function', id: 'calculate',
      signature: { mode: 'inline', definition: SignatureDefinition.create() },
      implementation: { mode: 'procedure' },
    }, [procedure])
    const commonTypes = node(4, { kind: 'types' })
    const root = commonProject(commonTypes, functionNode)

    expect(FunctionSignatureExtraction.canPlaceAt(root, functionNode.id, commonTypes)).toBe(true)
    expect(FunctionSignatureExtraction.canPlaceAt(root, functionNode.id, procedure)).toBe(false)

    const appObject = node(14, {
      kind: 'object-type', typeId: 'payload-type', id: 'Payload',
      properties: [], baseObjectIds: [],
    })
    const appTypes = node(13, { kind: 'types' }, [appObject])
    const localFunction = node(16, {
      kind: 'function', id: 'send',
      signature: { mode: 'inline', definition: SignatureDefinition.create(false, [
        SignatureDefinition.createParameter(
          'payload',
          TypeExpression.createReference(['payload-type']),
        ),
      ]) },
      implementation: { mode: 'procedure' },
    })
    const scopedRoot = node(10, { kind: 'project' }, [
      node(11, { kind: 'common' }, [
        node(12, { kind: 'declares' }, [commonTypes]),
      ]),
      node(17, { kind: 'app', appId: 'app-id', id: 'main' }, [
        node(18, { kind: 'declares' }, [
          appTypes,
          node(19, { kind: 'functions' }, [localFunction]),
        ]),
      ]),
    ])

    expect(FunctionSignatureExtraction.canPlaceAt(scopedRoot, localFunction.id, appTypes)).toBe(true)
    expect(FunctionSignatureExtraction.canPlaceAt(scopedRoot, localFunction.id, commonTypes)).toBe(false)
  })

  it('rejects Refer Functions and duplicate destination names', () => {
    const existing = node(8, {
      kind: 'signature-type', typeId: 'existing-signature', id: 'CalculateSignature',
      ...SignatureDefinition.create(),
    })
    const types = node(4, { kind: 'types' }, [existing])
    const inlineFunction = node(6, {
      kind: 'function', id: 'calculate',
      signature: { mode: 'inline', definition: SignatureDefinition.create() },
      implementation: { mode: 'procedure' },
    })
    const root = commonProject(types, inlineFunction)

    expect(() => FunctionSignatureExtraction.plan(
      root,
      inlineFunction.id,
      types.id,
      'CalculateSignature',
    )).toThrow('Already exists.')

    const referFunction = node(9, {
      kind: 'function', id: 'refer',
      signature: { mode: 'refer', signatureTypeId: 'existing-signature' },
      implementation: { mode: 'procedure' },
    })
    const referRoot = commonProject(types, referFunction)
    expect(FunctionSignatureExtraction.canPlaceAt(referRoot, referFunction.id, types)).toBe(false)
    expect(() => FunctionSignatureExtraction.plan(
      referRoot,
      referFunction.id,
      types.id,
      'ReferSignature',
    )).toThrow('Only a Function with an Inline Signature can be extracted.')
  })
})
