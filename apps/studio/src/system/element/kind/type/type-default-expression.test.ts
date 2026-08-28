import { describe, expect, it } from 'vitest'
import FormulaContext from '../../../runtime/formula/formula-context'
import FormulaEvaluator from '../../../runtime/formula/formula-evaluator'
import TypeValue from '../../../runtime/type-value'
import type TreeNode from '../../../tree/tree-node'
import TypeDefaultExpression from './type-default-expression'
import TypeExpression from './type-expression'

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

describe('TypeDefaultExpression', () => {
  it('creates recursive Object defaults with executable Signature values', () => {
    const handlerType = {
      kind: 'signature-type',
      typeId: 'handler-type',
      id: 'Handler',
      async: false,
      parameters: [{
        id: 'value',
        valueType: TypeExpression.createPrimitive('string'),
        nullable: false,
      }],
      returnType: {
        valueType: TypeExpression.createPrimitive('number'),
        nullable: false,
      },
    }
    const modelType = {
      kind: 'object-type',
      typeId: 'model-type',
      id: 'Model',
      baseObjectIds: [],
      properties: [
        TypeExpression.createProperty('name', TypeExpression.createPrimitive('string')),
        TypeExpression.createProperty('age', TypeExpression.createPrimitive('number')),
        TypeExpression.createProperty(
          'handler',
          TypeExpression.createNamed('handler-type', 'signature'),
        ),
        {
          ...TypeExpression.createProperty('optionalValue'),
          optional: true,
        },
      ],
    }
    const root = node(1, { kind: 'project' }, [
      node(2, handlerType),
      node(3, modelType),
    ])
    const valueType = TypeExpression.createReference(['model-type'])
    const source = TypeDefaultExpression.create(root, valueType)
    const result = FormulaEvaluator.evaluateExpression(source, FormulaContext.createEmpty())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toMatchObject({ name: '', age: 0 })
    expect(result.value).not.toHaveProperty('optionalValue')
    expect(TypeValue.isCompatible(valueType, result.value, root)).toBe(true)
    const handler = (result.value as { handler: (value: string) => number }).handler
    expect(handler('ignored')).toBe(0)
  })

  it('creates void, async, and recursive Signature defaults as formulas', async () => {
    const voidSignature = {
      kind: 'signature-type',
      typeId: 'void-type',
      id: 'VoidHandler',
      async: false,
      parameters: [],
      returnType: null,
    }
    const asyncSignature = {
      kind: 'signature-type',
      typeId: 'async-type',
      id: 'AsyncNumber',
      async: true,
      parameters: [],
      returnType: {
        valueType: TypeExpression.createPrimitive('number'),
        nullable: false,
      },
    }
    const recursiveSignature = {
      kind: 'signature-type',
      typeId: 'recursive-type',
      id: 'Recursive',
      async: false,
      parameters: [],
      returnType: {
        valueType: TypeExpression.createNamed('recursive-type', 'signature'),
        nullable: false,
      },
    }
    const root = node(1, { kind: 'project' }, [
      node(2, voidSignature),
      node(3, asyncSignature),
      node(4, recursiveSignature),
    ])
    const evaluate = (typeId: string) => FormulaEvaluator.evaluateExpression(
      TypeDefaultExpression.create(root, TypeExpression.createNamed(typeId, 'signature')),
      FormulaContext.createEmpty(),
    )

    const voidResult = evaluate('void-type')
    expect(voidResult.ok).toBe(true)
    if (voidResult.ok) expect((voidResult.value as () => unknown)()).toBeUndefined()

    const asyncResult = evaluate('async-type')
    expect(asyncResult.ok).toBe(true)
    if (asyncResult.ok) await expect((asyncResult.value as () => Promise<number>)()).resolves.toBe(0)

    const recursiveResult = evaluate('recursive-type')
    expect(recursiveResult.ok).toBe(true)
    if (recursiveResult.ok) {
      const recursive = recursiveResult.value as () => unknown
      expect(recursive()).toBe(recursive)
    }
  })
})
