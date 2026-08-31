import { describe, expect, it, vi } from 'vitest'

vi.mock('../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))
import BlockElement from '../../element/kind/block/block-element'
import RetentionElement from '../../element/kind/component/definition/retention-element'
import StylesElement from '../../element/kind/declare/styles-element'
import TypesElement from '../../element/kind/declare/types-element'
import FunctionProcedureElement from '../../element/kind/function/function-procedure-element'
import ProjectElement from '../../element/kind/project/project-element'
import ObjectTypeElement from '../../element/kind/type/object/object-type-element'
import SignatureDefinition from '../../element/kind/type/signature/signature-definition'
import TypeExpression from '../../element/kind/type/type-expression'
import UnionDefinition from '../../element/kind/type/union/union-definition'
import StyleElement from '../../element/kind/view/style/style-element'
import StyleParamElement from '../../element/kind/view/style/style-param-element'
import type MebacoElement from '../../element/element'
import TreeNode from '../tree-node'
import TreeTransferCatalog from './tree-transfer-catalog'
import TreeTransferPlanner from './tree-transfer-planner'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('TreeTransfer', () => {
  it('exposes only structurally compatible paste destinations', () => {
    const style = node(3, StyleElement.create('card', [], [], 'style-id'))
    const object = node(5, ObjectTypeElement.create('User', 'type-id'))
    const retentionBlock = node(8, BlockElement.create())
    const retention = node(7, RetentionElement.create(), [retentionBlock])
    const procedure = node(9, FunctionProcedureElement.create())
    const styles = node(2, StylesElement.create(), [style])
    const types = node(4, TypesElement.create(), [object])
    const root = node(1, ProjectElement.create(), [styles, types, retention, procedure])

    expect(TreeTransferCatalog.canPasteTo(root, style, styles, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, style, retention, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, style, retentionBlock, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, style, types, 'copy')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, style, procedure, 'copy')).toBe(false)

    expect(TreeTransferCatalog.canPasteTo(root, object, types, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, object, retention, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, object, procedure, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, object, styles, 'copy')).toBe(false)
  })

  it('copies a Style subtree with fresh owned identities and preserved external references', () => {
    const external = node(3, StyleElement.create('base', [], [], 'external-style'), [
      node(4, { kind: 'style-params' }),
    ])
    const source = node(5, StyleElement.create('card', [], [{
      referenceId: 'source-reference',
      styleId: 'external-style',
      arguments: [{ parameterId: 'external-parameter', binding: { type: 'delegate' } }],
    }], 'source-style'), [
      node(6, { kind: 'style-params' }, [
        node(7, StyleParamElement.create('accent', 'string', undefined, 'source-parameter')),
      ]),
    ])
    const styles = node(2, StylesElement.create(), [external, source])
    const root = node(1, ProjectElement.create(), [styles])

    const plan = TreeTransferPlanner.copy(root, source.id, styles.id, 'card-copy')
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)
    expect(copied?.element).toMatchObject({ kind: 'style', id: 'card-copy' })
    if (copied?.element.kind !== 'style') throw new Error('Expected copied Style.')
    expect(copied.element.styleId).not.toBe('source-style')
    expect(copied.element.bases[0]).toMatchObject({
      styleId: 'external-style',
      arguments: [{ parameterId: 'external-parameter' }],
    })
    expect(copied.element.bases[0].referenceId).not.toBe('source-reference')
    const copiedParameter = copied.children[0]?.children[0]?.element
    expect(copiedParameter?.kind).toBe('style-param')
    if (copiedParameter?.kind !== 'style-param') throw new Error('Expected copied parameter.')
    expect(copiedParameter.parameterId).not.toBe('source-parameter')
    expect(source.element).toMatchObject({ styleId: 'source-style', id: 'card' })
  })

  it('remaps recursive Object references and nested Property identities', () => {
    const nested = TypeExpression.createProperty(
      'nested',
      TypeExpression.createPrimitive(),
      'nested-property',
    )
    const recursive = TypeExpression.createProperty(
      'child',
      TypeExpression.createReference(['source-type']),
      'recursive-property',
    )
    const inline = TypeExpression.createProperty(
      'details',
      TypeExpression.createObject([nested]),
      'inline-property',
    )
    const source = node(3, ObjectTypeElement.create(
      'Node',
      'source-type',
      [recursive, inline],
    ))
    const types = node(2, TypesElement.create(), [source])
    const root = node(1, ProjectElement.create(), [types])

    const plan = TreeTransferPlanner.copy(root, source.id, types.id, 'NodeCopy')
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)?.element
    expect(copied?.kind).toBe('object-type')
    if (copied?.kind !== 'object-type') throw new Error('Expected copied Object Type.')
    expect(copied.typeId).not.toBe('source-type')
    expect(copied.properties.map((property) => property.propertyId))
      .not.toContain('recursive-property')
    const copiedReference = TypeExpression.unwrapArray(copied.properties[0].valueType).base
    expect(copiedReference).toMatchObject({
      type: 'reference',
      objectTypeIds: [copied.typeId],
    })
    const copiedInline = TypeExpression.unwrapArray(copied.properties[1].valueType).base
    if (copiedInline.type !== 'object') throw new Error('Expected inline Object.')
    expect(copiedInline.properties[0].propertyId).not.toBe('nested-property')
  })

  it('copies a Signature with fresh member identities and preserved external type references', () => {
    const definition = SignatureDefinition.create(false, [
        SignatureDefinition.createParameter(
          'value',
          TypeExpression.createObject([
            TypeExpression.createProperty(
              'payload',
              TypeExpression.createReference(['external-object']),
              'nested-property',
            ),
          ]),
          false,
          'source-parameter',
        ),
      ], {
        valueType: TypeExpression.createNamed('external-union'),
        nullable: false,
      })
    const source = node(4, {
      kind: 'signature-type',
      id: 'Mapper',
      typeId: 'source-signature',
      ...definition,
    })
    const types = node(2, TypesElement.create(), [source])
    const root = node(1, ProjectElement.create(), [types])

    const plan = TreeTransferPlanner.copy(root, source.id, types.id, 'MapperCopy')
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)?.element
    expect(copied?.kind).toBe('signature-type')
    if (copied?.kind !== 'signature-type') throw new Error('Expected copied Signature Type.')
    expect(copied.typeId).not.toBe('source-signature')
    expect(copied.parameters[0].parameterId).not.toBe('source-parameter')
    const parameterObject = TypeExpression.unwrapArray(copied.parameters[0].valueType).base
    if (parameterObject.type !== 'object') throw new Error('Expected inline Object parameter.')
    expect(parameterObject.properties[0].propertyId).not.toBe('nested-property')
    expect(TypeExpression.unwrapArray(parameterObject.properties[0].valueType).base)
      .toMatchObject({ type: 'reference', objectTypeIds: ['external-object'] })
    expect(copied.returnType?.valueType)
      .toMatchObject({ type: 'named', namedTypeId: 'external-union' })
  })

  it('copies a Union with a fresh definition identity and preserved member references', () => {
    const source = node(3, {
      kind: 'union-type',
      id: 'Result',
      typeId: 'source-union',
      definition: UnionDefinition.createObject(['success-object', 'error-object']),
    })
    const types = node(2, TypesElement.create(), [source])
    const root = node(1, ProjectElement.create(), [types])

    const plan = TreeTransferPlanner.copy(root, source.id, types.id, 'ResultCopy')
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)?.element
    expect(copied?.kind).toBe('union-type')
    if (copied?.kind !== 'union-type') throw new Error('Expected copied Union Type.')
    expect(copied.typeId).not.toBe('source-union')
    expect(copied.definition).toEqual(UnionDefinition.createObject([
      'success-object',
      'error-object',
    ]))
  })

  it('rejects duplicate destination names before changing the tree', () => {
    const source = node(3, ObjectTypeElement.create('User', 'source-type'))
    const existing = node(4, ObjectTypeElement.create('UserCopy', 'existing-type'))
    const types = node(2, TypesElement.create(), [source, existing])
    const root = node(1, ProjectElement.create(), [types])

    expect(() => TreeTransferPlanner.copy(root, source.id, types.id, 'UserCopy'))
      .toThrow('Already exists.')
    expect(types.children).toHaveLength(2)
  })
})
