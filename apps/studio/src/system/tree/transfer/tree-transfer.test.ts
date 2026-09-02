import { describe, expect, it, vi } from 'vitest'

vi.mock('../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))
vi.mock('../../validation/expression/expression-verification-runner', () => ({
  default: { verify: vi.fn() },
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
import TagElement from '../../element/kind/view/tag/tag-element'
import type MebacoElement from '../../element/element'
import TreeNode from '../tree-node'
import TreeTransferCatalog from './tree-transfer-catalog'
import TreeTransferPlanner from './tree-transfer-planner'
import TreeTransferValidator from './tree-transfer-validator'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

type FunctionFixture = Extract<MebacoElement.Element, { kind: 'function' }>

const inlineFunction = (
  id: string,
  definition = SignatureDefinition.create(),
  implementation: FunctionFixture['implementation'] = { mode: 'procedure' },
): FunctionFixture => ({
  kind: 'function',
  id,
  signature: { mode: 'inline', definition },
  implementation,
})

const referFunction = (
  id: string,
  signatureTypeId: string,
  implementation: FunctionFixture['implementation'] = { mode: 'procedure' },
): FunctionFixture => ({
  kind: 'function',
  id,
  signature: { mode: 'refer', signatureTypeId },
  implementation,
})

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
    const functionNode = node(10, inlineFunction('calculate'))
    const functions = node(11, { kind: 'functions' }, [functionNode])
    root.children.push(functions)

    expect(TreeTransferCatalog.canPasteTo(root, style, styles, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, style, retention, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, style, retentionBlock, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, style, types, 'copy')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, style, procedure, 'copy')).toBe(false)

    expect(TreeTransferCatalog.canPasteTo(root, object, types, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, object, retention, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, object, procedure, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, object, styles, 'copy')).toBe(false)

    expect(TreeTransferCatalog.canPasteTo(root, functionNode, functions, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, functionNode, retention, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, functionNode, procedure, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, functionNode, types, 'copy')).toBe(false)
  })

  it('offers only View content destinations for a Tag', () => {
    const source = node(3, TagElement.create('span', 'source'))
    const containerTag = node(4, TagElement.create('div', 'container'))
    const retainedElements = node(7, { kind: 'elements' })
    const retainedTag = node(5, TagElement.create('div', 'retained'), [
      node(6, { kind: 'retention' }),
      retainedElements,
    ])
    const voidTag = node(8, TagElement.create('img', 'void'))
    const viewBlock = node(9, BlockElement.create())
    const viewIf = node(11, { kind: 'if', condition: 'true' })
    const conditional = node(10, { kind: 'conditional' }, [viewIf])
    const slotUse = node(12, { kind: 'slot-use', slotId: 'slot-id', propBindings: [] })
    const elements = node(2, { kind: 'elements' }, [
      source,
      containerTag,
      retainedTag,
      voidTag,
      viewBlock,
      conditional,
      slotUse,
    ])
    const retentionBlock = node(14, BlockElement.create())
    const retention = node(13, RetentionElement.create(), [retentionBlock])
    const procedureBlock = node(16, BlockElement.create())
    const procedure = node(15, FunctionProcedureElement.create(), [procedureBlock])
    const controlIf = node(18, { kind: 'if', condition: 'true' })
    const control = node(17, { kind: 'control-conditional' }, [controlIf])
    const root = node(1, ProjectElement.create(), [elements, retention, procedure, control])

    expect(TreeTransferCatalog.canPasteTo(root, source, elements, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, containerTag, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, retainedTag, 'copy')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, source, retainedElements, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, voidTag, 'copy')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, source, viewBlock, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, viewIf, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, slotUse, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, retentionBlock, 'copy')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, source, procedureBlock, 'copy')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, source, controlIf, 'copy')).toBe(false)
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

  it('copies an unnamed Tag while preserving values and refreshing Style application identities', () => {
    const style = node(3, StyleElement.create('card', [], [], 'external-style'), [
      node(4, { kind: 'style-params' }),
    ])
    const source = node(6, TagElement.create(
      'button',
      'Save',
      [{
        referenceId: 'source-style-reference',
        styleId: 'external-style',
        arguments: [],
      }],
      [
        { type: 'attribute', name: 'title', value: { type: 'literal', value: 'Save' } },
        {
          type: 'event', name: 'click', preventDefault: true, stopPropagation: false,
          action: { type: 'script', source: 'return undefined' },
        },
      ],
      { type: 'literal', value: 'saveButton' },
    ))
    const elements = node(5, { kind: 'elements' }, [source])
    const root = node(1, ProjectElement.create(), [
      node(2, StylesElement.create(), [style]),
      elements,
    ])

    const plan = TreeTransferPlanner.copy(root, source.id, elements.id, null)
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)
    if (copied?.element.kind !== 'tag') throw new Error('Expected copied Tag.')

    expect(copied.element).toMatchObject({
      tagName: 'button',
      comment: 'Save',
      refKey: { type: 'literal', value: 'saveButton' },
      attributes: source.element.kind === 'tag' ? source.element.attributes : [],
    })
    expect(copied.element.styles[0]).toMatchObject({
      styleId: 'external-style',
      arguments: [],
    })
    expect(copied.element.styles[0].referenceId).not.toBe('source-style-reference')
    expect(plan.nodeIds.get(source.id)).toBe(copied.id)
    expect(TreeTransferValidator.validateStructure(plan.rootNode, copied.id)).toBeNull()
    expect(TreeTransferValidator.validateReferenceTargets(
      root,
      plan.rootNode,
      plan.nodeIds,
    )).toBeNull()
  })

  it('remaps local Style, Component, Prop, and Slot identities in a retained Tag subtree', () => {
    const localStyle = node(5, StyleElement.create('localCard', [], [], 'local-style'), [
      node(6, { kind: 'style-params' }, [
        node(7, StyleParamElement.create('tone', 'string', undefined, 'local-style-param')),
      ]),
    ])
    const localProp = node(10, {
      kind: 'value-prop', propId: 'local-prop', id: 'label',
      valueType: TypeExpression.createPrimitive('string'), nullable: false,
    })
    const localSlot = node(12, { kind: 'slot', slotId: 'local-slot', id: 'content' }, [
      node(13, { kind: 'props' }),
    ])
    const localComponent = node(8, {
      kind: 'component', componentId: 'local-component', id: 'LocalCard', local: true,
    }, [
      node(9, { kind: 'props' }, [localProp]),
      node(11, { kind: 'slots' }, [localSlot]),
    ])
    const styledChild = node(16, TagElement.create('div', 'styled', [{
      referenceId: 'local-style-reference',
      styleId: 'local-style',
      arguments: [{
        parameterId: 'local-style-param',
        binding: { type: 'value', value: { type: 'literal', value: 'warm' } },
      }],
    }]))
    const componentUse = node(17, {
      kind: 'component-use',
      componentId: 'local-component',
      propBindings: [{
        propId: 'local-prop', kind: 'value',
        source: { type: 'literal', value: 'Copied' },
      }],
    }, [
      node(18, { kind: 'slot-contents' }, [
        node(19, { kind: 'slot-content', slotId: 'local-slot' }),
      ]),
    ])
    const source = node(3, TagElement.create('div', 'source'), [
      node(4, { kind: 'retention' }, [localStyle, localComponent]),
      node(15, { kind: 'elements' }, [styledChild, componentUse]),
    ])
    const elements = node(2, { kind: 'elements' }, [source])
    const root = node(1, ProjectElement.create(), [elements])

    const plan = TreeTransferPlanner.copy(root, source.id, elements.id, null)
    const copiedRoot = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)
    const copiedRetention = copiedRoot?.children[0]
    const copiedElements = copiedRoot?.children[1]
    const copiedStyle = copiedRetention?.children[0]?.element
    const copiedComponent = copiedRetention?.children[1]?.element
    const copiedProp = copiedRetention?.children[1]?.children[0]?.children[0]?.element
    const copiedSlot = copiedRetention?.children[1]?.children[1]?.children[0]?.element
    const copiedStyledTag = copiedElements?.children[0]?.element
    const copiedUse = copiedElements?.children[1]?.element
    const copiedSlotContent = copiedElements?.children[1]?.children[0]?.children[0]?.element
    if (
      copiedStyle?.kind !== 'style'
      || copiedComponent?.kind !== 'component'
      || copiedProp?.kind !== 'value-prop'
      || copiedSlot?.kind !== 'slot'
      || copiedStyledTag?.kind !== 'tag'
      || copiedUse?.kind !== 'component-use'
      || copiedSlotContent?.kind !== 'slot-content'
    ) throw new Error('Expected a complete copied Tag subtree.')

    expect(copiedStyle.styleId).not.toBe('local-style')
    const copiedStyleParam = copiedRetention?.children[0]?.children[0]?.children[0]?.element
    if (copiedStyleParam?.kind !== 'style-param') throw new Error('Expected Style parameter.')
    expect(copiedStyleParam.parameterId).not.toBe('local-style-param')
    expect(copiedStyledTag.styles[0]).toMatchObject({
      styleId: copiedStyle.styleId,
      arguments: [{ parameterId: copiedStyleParam.parameterId }],
    })
    expect(copiedStyledTag.styles[0].referenceId).not.toBe('local-style-reference')

    expect(copiedComponent.componentId).not.toBe('local-component')
    expect(copiedProp.propId).not.toBe('local-prop')
    expect(copiedSlot.slotId).not.toBe('local-slot')
    expect(copiedUse.componentId).toBe(copiedComponent.componentId)
    expect(copiedUse.propBindings[0].propId).toBe(copiedProp.propId)
    expect(copiedSlotContent.slotId).toBe(copiedSlot.slotId)
    expect(new Set(plan.nodeIds.values()).size).toBe(plan.nodeIds.size)
    expect([...plan.nodeIds].every(([before, after]) => before !== after)).toBe(true)
    expect(TreeTransferValidator.validateStructure(
      plan.rootNode,
      plan.copiedNodeId,
    )).toBeNull()
    expect(TreeTransferValidator.validateReferenceTargets(
      root,
      plan.rootNode,
      plan.nodeIds,
    )).toBeNull()
  })

  it('rejects a Tag copy when an external local Component is unavailable at the destination', () => {
    const localComponent = node(5, {
      kind: 'component', componentId: 'source-local-component', id: 'SourceLocal', local: true,
    }, [node(6, { kind: 'props' })])
    const source = node(8, TagElement.create('div', 'source'), [
      node(9, {
        kind: 'component-use',
        componentId: 'source-local-component',
        propBindings: [],
      }),
    ])
    const sourceHost = node(3, TagElement.create('div', 'source host'), [
      node(4, { kind: 'retention' }, [localComponent]),
      node(7, { kind: 'elements' }, [source]),
    ])
    const destinationElements = node(12, { kind: 'elements' })
    const destinationHost = node(10, TagElement.create('div', 'destination host'), [
      node(11, { kind: 'retention' }),
      destinationElements,
    ])
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'elements' }, [sourceHost, destinationHost]),
    ])

    const plan = TreeTransferPlanner.copy(
      root,
      source.id,
      destinationElements.id,
      null,
    )

    expect(TreeTransferValidator.validateStructure(
      plan.rootNode,
      plan.copiedNodeId,
    )).toContain('unavailable Component')
  })

  it('detects a Prop reference rebinding when copying a Tag across Components', () => {
    const prop = (id: number, propId: string) => node(id, {
      kind: 'value-prop', propId, id: 'value',
      valueType: TypeExpression.createPrimitive('string'), nullable: false,
    })
    const source = node(6, TagElement.create('div', 'source', [], [{
      type: 'property',
      name: 'textContent',
      value: { type: 'formula', source: '$props.value' },
    }]))
    const sourceElements = node(5, { kind: 'elements' }, [source])
    const destinationElements = node(10, { kind: 'elements' })
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'component', componentId: 'source-component', id: 'Source' }, [
        node(3, { kind: 'props' }, [prop(4, 'source-prop')]),
        sourceElements,
      ]),
      node(7, { kind: 'component', componentId: 'destination-component', id: 'Destination' }, [
        node(8, { kind: 'props' }, [prop(9, 'destination-prop')]),
        destinationElements,
      ]),
    ])

    const plan = TreeTransferPlanner.copy(
      root,
      source.id,
      destinationElements.id,
      null,
    )

    expect(TreeTransferValidator.validateReferenceTargets(
      root,
      plan.rootNode,
      plan.nodeIds,
    )).toContain('would change a reference target')
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

  it('copies a Code Function with fresh Signature identities and rewritten self calls', () => {
    const signature = SignatureDefinition.create(false, [
      SignatureDefinition.createParameter(
        'value',
        TypeExpression.createObject([
          TypeExpression.createProperty(
            'name',
            TypeExpression.createPrimitive(),
            'source-property',
          ),
        ]),
        false,
        'source-parameter',
      ),
    ])
    const source = node(5, inlineFunction(
      'calculate',
      signature,
      { mode: 'code', source: 'return $fn.calculate($args.value)' },
    ))
    const functions = node(4, { kind: 'functions' }, [source])
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'common' }, [
        node(3, { kind: 'declares' }, [functions]),
      ]),
    ])

    const plan = TreeTransferPlanner.copy(root, source.id, functions.id, 'calculateCopy')
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)?.element
    if (copied?.kind !== 'function' || copied.signature.mode !== 'inline') {
      throw new Error('Expected copied inline Function.')
    }

    expect(copied.id).toBe('calculateCopy')
    expect(copied.signature.definition.parameters[0].parameterId)
      .not.toBe('source-parameter')
    const copiedParameterType = TypeExpression.unwrapArray(
      copied.signature.definition.parameters[0].valueType,
    ).base
    if (copiedParameterType.type !== 'object') throw new Error('Expected inline Object.')
    expect(copiedParameterType.properties[0].propertyId).not.toBe('source-property')
    expect(copied.implementation).toEqual({
      mode: 'code',
      source: 'return $fn.calculateCopy($args.value)',
    })
    expect((source.element as FunctionFixture).implementation).toEqual({
      mode: 'code',
      source: 'return $fn.calculate($args.value)',
    })
    expect(TreeTransferValidator.validateReferenceTargets(
      root,
      plan.rootNode,
      plan.nodeIds,
    )).toBeNull()
  })

  it('does not rewrite a same-name nested Function that shadows the copied Function', () => {
    const nested = node(7, inlineFunction(
      'calculate',
      SignatureDefinition.create(),
      { mode: 'code', source: 'return $fn.calculate()' },
    ))
    const source = node(5, inlineFunction('calculate'), [
      node(6, FunctionProcedureElement.create(), [nested]),
    ])
    const functions = node(4, { kind: 'functions' }, [source])
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'common' }, [
        node(3, { kind: 'declares' }, [functions]),
      ]),
    ])

    const plan = TreeTransferPlanner.copy(root, source.id, functions.id, 'calculateCopy')
    const copiedNested = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)
      ?.children[0]?.children[0]?.element

    expect(copiedNested).toMatchObject({
      kind: 'function',
      id: 'calculate',
      implementation: { mode: 'code', source: 'return $fn.calculate()' },
    })
    expect(TreeTransferValidator.validateReferenceTargets(
      root,
      plan.rootNode,
      plan.nodeIds,
    )).toBeNull()
  })

  it('remaps local definitions throughout a copied Procedure Function', () => {
    const localObject = node(7, ObjectTypeElement.create(
      'Payload',
      'local-object',
      [TypeExpression.createProperty(
        'value',
        TypeExpression.createReference(['external-object']),
        'local-property',
      )],
    ))
    const localSignature = node(8, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'local-signature',
      ...SignatureDefinition.create(false, [
        SignatureDefinition.createParameter(
          'payload',
          TypeExpression.createReference(['local-object']),
          false,
          'local-parameter',
        ),
      ]),
    })
    const nestedFunction = node(9, referFunction(
      'handle',
      'local-signature',
      { mode: 'code', source: 'return undefined' },
    ))
    const procedure = node(6, FunctionProcedureElement.create(), [
      localObject,
      localSignature,
      nestedFunction,
    ])
    const source = node(5, inlineFunction('process'), [procedure])
    const functions = node(4, { kind: 'functions' }, [source])
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'common' }, [
        node(3, { kind: 'declares' }, [
          node(10, { kind: 'types' }, [
            node(11, ObjectTypeElement.create('External', 'external-object')),
          ]),
          functions,
        ]),
      ]),
    ])

    const plan = TreeTransferPlanner.copy(root, source.id, functions.id, 'processCopy')
    const copiedRoot = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)
    const copiedProcedure = copiedRoot?.children[0]
    const copiedObject = copiedProcedure?.children[0]?.element
    const copiedSignature = copiedProcedure?.children[1]?.element
    const copiedNestedFunction = copiedProcedure?.children[2]?.element
    if (
      copiedObject?.kind !== 'object-type'
      || copiedSignature?.kind !== 'signature-type'
      || copiedNestedFunction?.kind !== 'function'
      || copiedNestedFunction.signature.mode !== 'refer'
    ) throw new Error('Expected copied local declarations.')

    expect(copiedObject.typeId).not.toBe('local-object')
    expect(copiedObject.properties[0].propertyId).not.toBe('local-property')
    expect(TypeExpression.unwrapArray(copiedObject.properties[0].valueType).base)
      .toMatchObject({ type: 'reference', objectTypeIds: ['external-object'] })
    expect(copiedSignature.typeId).not.toBe('local-signature')
    expect(copiedSignature.parameters[0].parameterId).not.toBe('local-parameter')
    expect(TypeExpression.unwrapArray(copiedSignature.parameters[0].valueType).base)
      .toMatchObject({ type: 'reference', objectTypeIds: [copiedObject.typeId] })
    expect(copiedNestedFunction.signature.signatureTypeId).toBe(copiedSignature.typeId)
    expect(new Set(plan.nodeIds.values()).size).toBe(plan.nodeIds.size)
    expect([...plan.nodeIds].every(([before, after]) => before !== after)).toBe(true)
    expect(TreeTransferValidator.validateStructure(
      plan.rootNode,
      plan.copiedNodeId,
    )).toBeNull()
    expect(TreeTransferValidator.validateReferenceTargets(
      root,
      plan.rootNode,
      plan.nodeIds,
    )).toBeNull()
  })

  it('detects a same-name external reference rebinding in another Function scope', () => {
    const sourceHelper = node(5, inlineFunction(
      'helper',
      SignatureDefinition.create(),
      { mode: 'code', source: "return 'source'" },
    ))
    const sourceFunction = node(9, inlineFunction(
      'readValue',
      SignatureDefinition.create(),
      { mode: 'code', source: 'return $fn.helper()' },
    ))
    const sourceFunctions = node(8, { kind: 'functions' }, [sourceHelper, sourceFunction])
    const sourceApp = node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
      node(6, { kind: 'declares' }, [sourceFunctions]),
    ])
    const destinationHelper = node(13, inlineFunction(
      'helper',
      SignatureDefinition.create(),
      { mode: 'code', source: "return 'destination'" },
    ))
    const destinationFunctions = node(16, { kind: 'functions' }, [destinationHelper])
    const destinationApp = node(10, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
      node(14, { kind: 'declares' }, [destinationFunctions]),
    ])
    const root = node(1, ProjectElement.create(), [sourceApp, destinationApp])

    const plan = TreeTransferPlanner.copy(
      root,
      sourceFunction.id,
      destinationFunctions.id,
      'readValueCopy',
    )

    expect(TreeTransferValidator.validateReferenceTargets(
      root,
      plan.rootNode,
      plan.nodeIds,
    )).toContain('would change a reference target')
  })

  it('detects an App State rebinding when copying a Function across Apps', () => {
    const state = (id: number, value: string) => node(id, {
      kind: 'state', id: 'value', valueType: TypeExpression.createPrimitive('number'),
      nullable: false, initial: { type: 'literal', value },
    })
    const sourceFunction = node(9, inlineFunction(
      'readValue',
      SignatureDefinition.create(),
      { mode: 'code', source: 'return $state.value' },
    ))
    const sourceFunctions = node(8, { kind: 'functions' }, [sourceFunction])
    const destinationFunctions = node(16, { kind: 'functions' })
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'store' }, [node(4, { kind: 'states' }, [state(5, '1')])]),
        node(6, { kind: 'declares' }, [sourceFunctions]),
      ]),
      node(10, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(11, { kind: 'store' }, [node(12, { kind: 'states' }, [state(13, '2')])]),
        node(14, { kind: 'declares' }, [destinationFunctions]),
      ]),
    ])

    const plan = TreeTransferPlanner.copy(
      root,
      sourceFunction.id,
      destinationFunctions.id,
      'readValueCopy',
    )

    expect(TreeTransferValidator.validateReferenceTargets(
      root,
      plan.rootNode,
      plan.nodeIds,
    )).toContain('would change a reference target')
  })
})
