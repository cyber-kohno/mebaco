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
import StyleKeyframesElement from '../../element/kind/view/style/style-keyframes-element'
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
  it('copies a Bundle only to Bundles with a fresh identity and no revision', () => {
    const source = node(3, {
      kind: 'bundle', bundleId: 'source-bundle-id', id: 'desktop',
      launcherIds: ['launcher-id'],
      revision: { generation: 4, contentHash: 'hash', builtAt: '2026-09-11T00:00:00.000Z' },
    })
    const bundles = node(2, { kind: 'bundles' }, [source])
    const apps = node(4, { kind: 'apps' })
    const root = node(1, ProjectElement.create(), [bundles, apps])

    expect(TreeTransferCatalog.canPasteTo(root, source, bundles, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, apps, 'copy')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, source, bundles, 'move')).toBe(false)

    const plan = TreeTransferPlanner.copy(root, source.id, bundles.id, 'desktop-copy')
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)
    expect(copied?.element).toMatchObject({
      kind: 'bundle', id: 'desktop-copy', launcherIds: ['launcher-id'],
    })
    if (copied?.element.kind !== 'bundle') throw new Error('Expected a copied Bundle.')
    expect(copied.element.bundleId).not.toBe(source.element.kind === 'bundle' ? source.element.bundleId : '')
    expect(copied.element.revision).toBeUndefined()
    expect(TreeTransferValidator.validateStructure(plan.rootNode, plan.copiedNodeId)).toBeNull()
  })

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

  it('enables Move only for the kinds introduced so far', () => {
    const style = node(3, StyleElement.create('card', [], [], 'style-id'))
    const object = node(5, ObjectTypeElement.create('User', 'type-id'))
    const union = node(13, {
      kind: 'union-type',
      id: 'Result',
      typeId: 'union-id',
      definition: UnionDefinition.createLiteral('string', ['ok']),
    })
    const signature = node(14, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'signature-id',
      ...SignatureDefinition.create(),
    })
    const movableFunction = node(15, inlineFunction('calculate'))
    const tag = node(12, TagElement.create('div', ''))
    const styles = node(2, StylesElement.create(), [style])
    const retention = node(6, RetentionElement.create())
    const root = node(1, ProjectElement.create(), [styles, object, retention])

    expect(TreeTransferCatalog.isMovableKind(style.element.kind)).toBe(true)
    expect(TreeTransferCatalog.isMovableKind(object.element.kind)).toBe(true)
    expect(TreeTransferCatalog.isMovableKind(union.element.kind)).toBe(true)
    expect(TreeTransferCatalog.isMovableKind(signature.element.kind)).toBe(true)
    expect(TreeTransferCatalog.isMovableKind(movableFunction.element.kind)).toBe(true)
    expect(TreeTransferCatalog.isMovableKind(tag.element.kind)).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, style, retention, 'move')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, style, styles, 'move')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, object, retention, 'move')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, union, retention, 'move')).toBe(true)
  })

  it('transfers regular Components only between Components folders', () => {
    const component = node(20, {
      kind: 'component', componentId: 'component-id', id: 'Card',
    })
    const localComponent = node(21, {
      kind: 'component', componentId: 'local-component-id', id: 'LocalCard', local: true,
    })
    const sourceComponents = node(22, { kind: 'components' }, [component])
    const destinationComponents = node(23, { kind: 'components' })
    const retention = node(24, { kind: 'retention' }, [localComponent])
    const root = node(1, ProjectElement.create(), [
      sourceComponents,
      destinationComponents,
      retention,
    ])

    expect(TreeTransferCatalog.isTransferable(component.element)).toBe(true)
    expect(TreeTransferCatalog.isMovable(component.element)).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(
      root,
      component,
      destinationComponents,
      'copy',
    )).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(
      root,
      component,
      destinationComponents,
      'move',
    )).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, component, retention, 'copy')).toBe(false)
    expect(TreeTransferCatalog.isTransferable(localComponent.element)).toBe(false)
    expect(TreeTransferCatalog.isMovable(localComponent.element)).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(
      root,
      localComponent,
      destinationComponents,
      'copy',
    )).toBe(false)
  })

  it('copies Apps only to the project Apps container and does not move them', () => {
    const source = node(3, { kind: 'app', appId: 'source-app-id', id: 'source-app' })
    const apps = node(2, { kind: 'apps' }, [source])
    const otherContainer = node(4, { kind: 'common' })
    const root = node(1, ProjectElement.create(), [apps, otherContainer])

    expect(TreeTransferCatalog.isTransferable(source.element)).toBe(true)
    expect(TreeTransferCatalog.isMovable(source.element)).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, source, apps, 'copy')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, otherContainer, 'copy')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, source, apps, 'move')).toBe(false)
    expect(TreeTransferCatalog.validateName(root, apps, 'app', 'source-app')).toBe('Already exists.')
    expect(TreeTransferCatalog.validateName(root, apps, 'app', 'SourceApp')).toContain('kebab-case')
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
    expect(TreeTransferCatalog.canPasteTo(root, source, containerTag, 'move')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, retainedElements, 'move')).toBe(true)
    expect(TreeTransferCatalog.canPasteTo(root, source, voidTag, 'move')).toBe(false)
    expect(TreeTransferCatalog.canPasteTo(root, source, retentionBlock, 'move')).toBe(false)
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

  it('copies a Component subtree with fresh owned identities and remapped references', () => {
    const componentProp = node(4, {
      kind: 'value-prop', propId: 'component-prop', id: 'title',
      valueType: TypeExpression.createPrimitive('string'), nullable: false,
    })
    const localProp = node(9, {
      kind: 'value-prop', propId: 'local-prop', id: 'label',
      valueType: TypeExpression.createPrimitive('string'), nullable: false,
    })
    const localSlot = node(11, {
      kind: 'slot', slotId: 'local-slot', id: 'content',
    }, [node(12, { kind: 'props' })])
    const localComponent = node(7, {
      kind: 'component', componentId: 'local-component', id: 'LocalCard', local: true,
    }, [
      node(8, { kind: 'props' }, [localProp]),
      node(10, { kind: 'slots' }, [localSlot]),
    ])
    const titleTag = node(14, TagElement.create('h2', '', [], [{
      type: 'property',
      name: 'textContent',
      value: { type: 'formula', source: '$props.title' },
    }]))
    const localUse = node(15, {
      kind: 'component-use',
      componentId: 'local-component',
      propBindings: [{
        propId: 'local-prop', kind: 'value',
        source: { type: 'literal', value: 'Copied' },
      }],
    }, [
      node(16, { kind: 'slot-contents' }, [
        node(17, { kind: 'slot-content', slotId: 'local-slot' }),
      ]),
    ])
    const source = node(3, {
      kind: 'component', componentId: 'source-component', id: 'Card',
    }, [
      node(5, { kind: 'props' }, [componentProp]),
      node(6, { kind: 'retention' }, [localComponent]),
      node(13, { kind: 'elements' }, [titleTag, localUse]),
    ])
    const components = node(2, { kind: 'components' }, [source])
    const root = node(1, ProjectElement.create(), [components])

    const plan = TreeTransferPlanner.copy(root, source.id, components.id, 'CardCopy')
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)
    const copiedProp = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(componentProp.id) ?? -1,
    )
    const copiedLocal = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(localComponent.id) ?? -1,
    )
    const copiedLocalProp = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(localProp.id) ?? -1,
    )
    const copiedSlot = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(localSlot.id) ?? -1,
    )
    const copiedUse = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(localUse.id) ?? -1,
    )
    const copiedSlotContent = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(17) ?? -1,
    )
    if (
      copied?.element.kind !== 'component'
      || copiedProp?.element.kind !== 'value-prop'
      || copiedLocal?.element.kind !== 'component'
      || copiedLocalProp?.element.kind !== 'value-prop'
      || copiedSlot?.element.kind !== 'slot'
      || copiedUse?.element.kind !== 'component-use'
      || copiedSlotContent?.element.kind !== 'slot-content'
    ) throw new Error('Expected a complete copied Component subtree.')

    expect(copied.element.id).toBe('CardCopy')
    expect(copied.element.local).toBeUndefined()
    expect(copied.element.componentId).not.toBe('source-component')
    expect(copiedProp.element.propId).not.toBe('component-prop')
    expect(copiedLocal.element.componentId).not.toBe('local-component')
    expect(copiedLocalProp.element.propId).not.toBe('local-prop')
    expect(copiedSlot.element.slotId).not.toBe('local-slot')
    expect(copiedUse.element.componentId).toBe(copiedLocal.element.componentId)
    expect(copiedUse.element.propBindings[0]?.propId).toBe(copiedLocalProp.element.propId)
    expect(copiedSlotContent.element.slotId).toBe(copiedSlot.element.slotId)
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

  it('copies an App subtree with fresh internal identities and preserved external references', () => {
    const sourceLaunchArgument = node(5, {
      kind: 'launch-argument', propId: 'source-launch-argument', id: 'session',
      valueType: TypeExpression.createPrimitive('string'), nullable: false,
    })
    const componentProp = node(12, {
      kind: 'value-prop', propId: 'source-component-prop', id: 'title',
      valueType: TypeExpression.createPrimitive('string'), nullable: false,
    })
    const component = node(10, {
      kind: 'component', componentId: 'source-component', id: 'Main',
    }, [node(11, { kind: 'props' }, [componentProp])])
    const entry = node(14, {
      kind: 'entry', componentId: 'source-component', propBindings: [{
        propId: 'source-component-prop', kind: 'value',
        source: { type: 'literal', value: 'Source' },
      }],
    })
    const transition = node(15, {
      kind: 'transition', appId: 'target-app-id', argumentBindings: [{
        propId: 'target-launch-argument', kind: 'value',
        source: { type: 'literal', value: 'Target' },
      }],
    })
    const source = node(3, {
      kind: 'app', appId: 'source-app-id', id: 'source-app',
    }, [
      node(4, { kind: 'launch-options' }, [
        node(6, { kind: 'launch-arguments' }, [sourceLaunchArgument]),
      ]),
      node(7, { kind: 'imports' }, [
        node(8, { kind: 'transitions', appIds: ['target-app-id'] }),
      ]),
      node(9, { kind: 'declares' }, [
        node(13, { kind: 'components' }, [component]),
      ]),
      entry,
      transition,
    ])
    const targetLaunchArgument = node(19, {
      kind: 'launch-argument', propId: 'target-launch-argument', id: 'value',
      valueType: TypeExpression.createPrimitive('string'), nullable: false,
    })
    const target = node(17, {
      kind: 'app', appId: 'target-app-id', id: 'target-app',
    }, [node(18, { kind: 'launch-options' }, [
      node(20, { kind: 'launch-arguments' }, [targetLaunchArgument]),
    ])])
    const apps = node(2, { kind: 'apps' }, [source, target])
    const launcher = node(22, {
      kind: 'launcher', launcherId: 'source-launcher', id: 'source',
      appId: 'source-app-id', argumentBindings: [{
        propId: 'source-launch-argument', kind: 'value',
        source: { type: 'literal', value: 'Launcher' },
      }],
    })
    const launchers = node(21, { kind: 'launchers' }, [launcher])
    const root = node(1, ProjectElement.create(), [apps, launchers])

    const plan = TreeTransferPlanner.copy(root, source.id, apps.id, 'source-app-copy')
    const copied = TreeNode.findNode(plan.rootNode, plan.copiedNodeId)
    const copiedLaunchArgument = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(sourceLaunchArgument.id) ?? -1,
    )
    const copiedComponent = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(component.id) ?? -1,
    )
    const copiedComponentProp = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(componentProp.id) ?? -1,
    )
    const copiedEntry = TreeNode.findNode(plan.rootNode, plan.nodeIds.get(entry.id) ?? -1)
    const copiedImports = TreeNode.findNode(plan.rootNode, plan.nodeIds.get(8) ?? -1)
    const copiedTransition = TreeNode.findNode(
      plan.rootNode,
      plan.nodeIds.get(transition.id) ?? -1,
    )
    const unchangedLauncher = TreeNode.findNode(plan.rootNode, launcher.id)
    if (
      copied?.element.kind !== 'app'
      || copiedLaunchArgument?.element.kind !== 'launch-argument'
      || copiedComponent?.element.kind !== 'component'
      || copiedComponentProp?.element.kind !== 'value-prop'
      || copiedEntry?.element.kind !== 'entry'
      || copiedImports?.element.kind !== 'transitions'
      || copiedTransition?.element.kind !== 'transition'
      || unchangedLauncher?.element.kind !== 'launcher'
    ) throw new Error('Expected a complete copied App subtree.')

    expect(copied.element).toMatchObject({ id: 'source-app-copy' })
    expect(copied.element.appId).not.toBe('source-app-id')
    expect(copiedLaunchArgument.element.propId).not.toBe('source-launch-argument')
    expect(copiedComponent.element.componentId).not.toBe('source-component')
    expect(copiedComponentProp.element.propId).not.toBe('source-component-prop')
    expect(copiedEntry.element.componentId).toBe(copiedComponent.element.componentId)
    expect(copiedEntry.element.propBindings[0]?.propId).toBe(copiedComponentProp.element.propId)
    expect(copiedImports.element.appIds).toEqual(['target-app-id'])
    expect(copiedTransition.element).toMatchObject({
      appId: 'target-app-id',
      argumentBindings: [{ propId: 'target-launch-argument' }],
    })
    expect(unchangedLauncher.element).toEqual(launcher.element)
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

  it('moves a Component subtree while preserving every identity', async () => {
    const prop = node(5, {
      kind: 'value-prop', propId: 'component-prop', id: 'title',
      valueType: TypeExpression.createPrimitive('string'), nullable: false,
    })
    const source = node(3, {
      kind: 'component', componentId: 'component-id', id: 'Card',
    }, [node(4, { kind: 'props' }, [prop])])
    const sourceComponents = node(2, { kind: 'components' }, [source])
    const destinationComponents = node(6, { kind: 'components' })
    const root = node(1, ProjectElement.create(), [sourceComponents, destinationComponents])

    const plan = TreeTransferPlanner.move(root, source.id, destinationComponents.id)
    const moved = TreeNode.findNode(plan.rootNode, source.id)
    const movedProp = TreeNode.findNode(plan.rootNode, prop.id)

    expect(plan.rootNode.children[0]?.children).toEqual([])
    expect(plan.rootNode.children[1]?.children[0]?.id).toBe(source.id)
    expect(moved?.element).toEqual(source.element)
    expect(movedProp?.element).toEqual(prop.element)
    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode)).toBeNull()
    expect(await TreeTransferValidator.validateMoveExpressionScope(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
  })

  it('rejects a Component copy or Move with a duplicate destination name', () => {
    const source = node(3, {
      kind: 'component', componentId: 'source-component', id: 'Card',
    })
    const existingCopy = node(6, {
      kind: 'component', componentId: 'existing-copy', id: 'CardCopy',
    })
    const existingMove = node(7, {
      kind: 'component', componentId: 'existing-move', id: 'Card',
    })
    const sourceComponents = node(2, { kind: 'components' }, [source])
    const destinationComponents = node(5, { kind: 'components' }, [existingCopy, existingMove])
    const root = node(1, ProjectElement.create(), [sourceComponents, destinationComponents])

    expect(() => TreeTransferPlanner.copy(
      root,
      source.id,
      destinationComponents.id,
      'CardCopy',
    )).toThrow()
    expect(() => TreeTransferPlanner.move(
      root,
      source.id,
      destinationComponents.id,
    )).toThrow()
  })

  it('rejects a Component Move when an existing Component View loses visibility', () => {
    const source = node(4, {
      kind: 'component', componentId: 'shared-component', id: 'SharedCard',
    })
    const commonComponents = node(3, { kind: 'components' }, [source])
    const common = node(2, { kind: 'common' }, [
      node(18, { kind: 'declares' }, [commonComponents]),
    ])
    const use = node(12, {
      kind: 'component-use', componentId: 'shared-component', propBindings: [],
    })
    const host = node(9, {
      kind: 'component', componentId: 'host-component', id: 'Host',
    }, [
      node(10, { kind: 'retention' }),
      node(11, { kind: 'elements' }, [use]),
    ])
    const firstApp = node(6, { kind: 'app', appId: 'first-app', id: 'first' }, [
      node(7, { kind: 'declares' }, [
        node(8, { kind: 'components' }, [host]),
      ]),
    ])
    const destinationComponents = node(16, { kind: 'components' })
    const secondApp = node(14, { kind: 'app', appId: 'second-app', id: 'second' }, [
      node(15, { kind: 'declares' }, [destinationComponents]),
    ])
    const root = node(1, ProjectElement.create(), [common, firstApp, secondApp])

    const plan = TreeTransferPlanner.move(root, source.id, destinationComponents.id)

    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toContain('unavailable Component')
  })

  it('rejects a Component Move when an App Entry loses its Component', () => {
    const source = node(3, {
      kind: 'component', componentId: 'entry-component', id: 'Main',
    })
    const sourceComponents = node(2, { kind: 'components' }, [source])
    const entry = node(4, {
      kind: 'entry', componentId: 'entry-component', propBindings: [],
    })
    const firstApp = node(5, { kind: 'app', appId: 'first-app', id: 'first' }, [
      sourceComponents,
      entry,
    ])
    const destinationComponents = node(7, { kind: 'components' })
    const secondApp = node(6, { kind: 'app', appId: 'second-app', id: 'second' }, [
      destinationComponents,
    ])
    const root = node(1, ProjectElement.create(), [firstApp, secondApp])

    const plan = TreeTransferPlanner.move(root, source.id, destinationComponents.id)

    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toContain('Entry refers to an unavailable Component')
  })

  it('moves a Style subtree atomically while preserving every identity', async () => {
    const parameter = node(
      7,
      StyleParamElement.create('accent', 'string', undefined, 'source-parameter'),
    )
    const source = node(
      5,
      StyleElement.create('card', [], [], 'source-style'),
      [node(6, { kind: 'style-params' }, [parameter])],
    )
    const styles = node(2, StylesElement.create(), [source])
    const destination = node(8, RetentionElement.create())
    const root = node(1, ProjectElement.create(), [styles, destination])

    const plan = TreeTransferPlanner.move(root, source.id, destination.id)
    const moved = TreeNode.findNode(plan.rootNode, source.id)
    const movedParameter = TreeNode.findNode(plan.rootNode, parameter.id)

    expect(styles.children).toEqual([source])
    expect(TreeNode.findNode(root, source.id)).toBe(source)
    expect(plan.rootNode.children[0].children).toEqual([])
    expect(plan.rootNode.children[1].children.map((child) => child.id)).toEqual([source.id])
    expect(moved?.element).toEqual(source.element)
    expect(movedParameter?.element).toEqual(parameter.element)
    expect(plan.movedNodeId).toBe(source.id)
    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode)).toBeNull()
    expect(await TreeTransferValidator.validateMoveExpressionScope(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
  })

  it('rejects a Style Move when its Id already exists at the destination', () => {
    const source = node(3, StyleElement.create('card', [], [], 'source-style'))
    const existing = node(6, StyleElement.create('card', [], [], 'existing-style'))
    const styles = node(2, StylesElement.create(), [source])
    const destination = node(5, RetentionElement.create(), [existing])
    const root = node(1, ProjectElement.create(), [styles, destination])

    expect(() => TreeTransferPlanner.move(root, source.id, destination.id))
      .toThrow('Already exists.')
    expect(styles.children).toEqual([source])
    expect(destination.children).toEqual([existing])
  })

  it('rejects a Style Move when an expression would bind to another App State', () => {
    const state = (id: number, stateId: string) => node(id, {
      kind: 'state',
      id: 'value',
      valueType: TypeExpression.createPrimitive('number'),
      nullable: false,
      initial: { type: 'literal', value: stateId === 'source-state' ? '1' : '2' },
    })
    const source = node(6, StyleElement.create('card', [{
      type: 'declaration',
      property: 'z-index',
      value: { type: 'formula', source: '$state.value.toString()' },
    }], [], 'source-style'))
    const sourceRetention = node(5, RetentionElement.create(), [source])
    const destinationRetention = node(11, RetentionElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'store' }, [node(4, { kind: 'states' }, [state(7, 'source-state')])]),
        sourceRetention,
      ]),
      node(8, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(9, { kind: 'store' }, [node(10, { kind: 'states' }, [state(12, 'destination-state')])]),
        destinationRetention,
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationRetention.id)

    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode))
      .toContain('would change a reference target')
  })

  it('moves an Object Type while preserving its Type and Property identities', async () => {
    const nestedProperty = TypeExpression.createProperty(
      'label',
      TypeExpression.createPrimitive(),
      'nested-property',
    )
    const source = node(5, ObjectTypeElement.create('Payload', 'payload-type', [
      TypeExpression.createProperty(
        'child',
        TypeExpression.createReference(['payload-type']),
        'recursive-property',
      ),
      TypeExpression.createProperty(
        'details',
        TypeExpression.createObject([nestedProperty]),
        'object-property',
      ),
    ]))
    const sourceTypes = node(4, TypesElement.create(), [source])
    const destinationTypes = node(8, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(6, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(7, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)
    const moved = TreeNode.findNode(plan.rootNode, source.id)?.element
    if (moved?.kind !== 'object-type') throw new Error('Expected moved Object Type.')

    expect(sourceTypes.children).toEqual([source])
    expect(plan.rootNode.children[0].children[0].children[0].children).toEqual([])
    expect(plan.rootNode.children[1].children[0].children[0].children[0].id).toBe(source.id)
    expect(moved.typeId).toBe('payload-type')
    expect(moved.properties.map((property) => property.propertyId)).toEqual([
      'recursive-property',
      'object-property',
    ])
    const movedNested = TypeExpression.unwrapArray(moved.properties[1].valueType).base
    if (movedNested.type !== 'object') throw new Error('Expected nested Object Type.')
    expect(movedNested.properties[0].propertyId).toBe('nested-property')
    expect(TypeExpression.unwrapArray(moved.properties[0].valueType).base).toMatchObject({
      type: 'reference',
      objectTypeIds: ['payload-type'],
    })
    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode)).toBeNull()
    expect(await TreeTransferValidator.validateMoveExpressionScope(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
  })

  it('rejects an Object Type Move when its Id already exists at the destination', () => {
    const source = node(5, ObjectTypeElement.create('Payload', 'source-type'))
    const existing = node(9, ObjectTypeElement.create('Payload', 'existing-type'))
    const sourceTypes = node(4, TypesElement.create(), [source])
    const destinationTypes = node(8, TypesElement.create(), [existing])
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(6, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(7, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    expect(() => TreeTransferPlanner.move(root, source.id, destinationTypes.id))
      .toThrow('Already exists.')
    expect(sourceTypes.children).toEqual([source])
    expect(destinationTypes.children).toEqual([existing])
  })

  it('rejects an Object Type Move that would break an incoming Type reference', () => {
    const source = node(5, ObjectTypeElement.create('Payload', 'payload-type'))
    const consumer = node(6, ObjectTypeElement.create('Envelope', 'envelope-type', [
      TypeExpression.createProperty(
        'payload',
        TypeExpression.createReference(['payload-type']),
        'payload-property',
      ),
    ]))
    const sourceTypes = node(4, TypesElement.create(), [source, consumer])
    const destinationTypes = node(9, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(7, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(8, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)

    expect(TreeTransferValidator.validateMoveStructure(root, plan.rootNode, source.id))
      .toContain(`node-${consumer.id}`)
  })

  it('rejects an Object Type Move that would change an external $type dependency', () => {
    const source = node(5, ObjectTypeElement.create('Payload', 'payload-type'))
    const sourceTypes = node(4, TypesElement.create(), [source])
    const action = node(6, {
      kind: 'action',
      comment: '',
      source: 'const payload = {} as $type.Payload; return payload',
    })
    const destinationTypes = node(9, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
        action,
      ]),
      node(7, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(8, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)

    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode))
      .toContain(`node-${action.id}`)
  })

  it('moves a Union Type while preserving its Type identity and definition', async () => {
    const source = node(5, {
      kind: 'union-type',
      id: 'Status',
      typeId: 'status-type',
      definition: UnionDefinition.createLiteral('string', ['ready', 'done']),
    })
    const sourceTypes = node(4, TypesElement.create(), [source])
    const destinationTypes = node(8, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(6, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(7, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)
    const moved = TreeNode.findNode(plan.rootNode, source.id)?.element
    if (moved?.kind !== 'union-type') throw new Error('Expected moved Union Type.')

    expect(sourceTypes.children).toEqual([source])
    expect(plan.rootNode.children[0].children[0].children[0].children).toEqual([])
    expect(plan.rootNode.children[1].children[0].children[0].children[0].id).toBe(source.id)
    expect(moved.typeId).toBe('status-type')
    expect(moved.definition).toEqual(
      UnionDefinition.createLiteral('string', ['ready', 'done']),
    )
    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode)).toBeNull()
    expect(await TreeTransferValidator.validateMoveExpressionScope(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
  })

  it('rejects a Union Type Move when its Id already exists at the destination', () => {
    const source = node(5, {
      kind: 'union-type',
      id: 'Status',
      typeId: 'source-union',
      definition: UnionDefinition.createLiteral('string', ['ready']),
    })
    const existing = node(9, {
      kind: 'union-type',
      id: 'Status',
      typeId: 'existing-union',
      definition: UnionDefinition.createLiteral('string', ['done']),
    })
    const sourceTypes = node(4, TypesElement.create(), [source])
    const destinationTypes = node(8, TypesElement.create(), [existing])
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(6, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(7, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    expect(() => TreeTransferPlanner.move(root, source.id, destinationTypes.id))
      .toThrow('Already exists.')
    expect(sourceTypes.children).toEqual([source])
    expect(destinationTypes.children).toEqual([existing])
  })

  it('rejects a Union Type Move when a referenced Object is unavailable there', () => {
    const object = node(5, ObjectTypeElement.create('Payload', 'payload-type'))
    const source = node(6, {
      kind: 'union-type',
      id: 'Result',
      typeId: 'result-type',
      definition: UnionDefinition.createObject(['payload-type']),
    })
    const sourceTypes = node(4, TypesElement.create(), [object, source])
    const destinationTypes = node(9, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(7, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(8, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)

    expect(TreeTransferValidator.validateMoveStructure(root, plan.rootNode, source.id))
      .toContain(`node-${source.id}`)
  })

  it('rejects a Union Type Move that would break an incoming named Type reference', () => {
    const source = node(5, {
      kind: 'union-type',
      id: 'Status',
      typeId: 'status-type',
      definition: UnionDefinition.createLiteral('string', ['ready']),
    })
    const consumer = node(6, ObjectTypeElement.create('Task', 'task-type', [
      TypeExpression.createProperty(
        'status',
        TypeExpression.createNamed('status-type'),
        'status-property',
      ),
    ]))
    const sourceTypes = node(4, TypesElement.create(), [source, consumer])
    const destinationTypes = node(9, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(7, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(8, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)

    expect(TreeTransferValidator.validateMoveStructure(root, plan.rootNode, source.id))
      .toContain(`node-${consumer.id}`)
  })

  it('moves a Signature Type while preserving all owned identities', async () => {
    const definition = SignatureDefinition.create(false, [
      SignatureDefinition.createParameter(
        'payload',
        TypeExpression.createObject([
          TypeExpression.createProperty(
            'value',
            TypeExpression.createPrimitive('string'),
            'nested-property',
          ),
        ]),
        false,
        'payload-parameter',
      ),
    ], {
      valueType: TypeExpression.createPrimitive('boolean'),
      nullable: false,
    })
    const source = node(5, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'handler-signature',
      ...definition,
    })
    const sourceTypes = node(4, TypesElement.create(), [source])
    const destinationTypes = node(8, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(6, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(7, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)
    const moved = TreeNode.findNode(plan.rootNode, source.id)?.element
    if (moved?.kind !== 'signature-type') throw new Error('Expected moved Signature Type.')

    expect(sourceTypes.children).toEqual([source])
    expect(plan.rootNode.children[0].children[0].children[0].children).toEqual([])
    expect(plan.rootNode.children[1].children[0].children[0].children[0].id).toBe(source.id)
    expect(moved.typeId).toBe('handler-signature')
    expect(moved.parameters[0].parameterId).toBe('payload-parameter')
    const parameterType = TypeExpression.unwrapArray(moved.parameters[0].valueType).base
    if (parameterType.type !== 'object') throw new Error('Expected inline Object parameter.')
    expect(parameterType.properties[0].propertyId).toBe('nested-property')
    expect(moved.returnType).toEqual(definition.returnType)
    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode)).toBeNull()
    expect(await TreeTransferValidator.validateMoveExpressionScope(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
  })

  it('rejects a Signature Type Move when its Id already exists at the destination', () => {
    const source = node(5, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'source-signature',
      ...SignatureDefinition.create(),
    })
    const existing = node(9, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'existing-signature',
      ...SignatureDefinition.create(),
    })
    const sourceTypes = node(4, TypesElement.create(), [source])
    const destinationTypes = node(8, TypesElement.create(), [existing])
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(6, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(7, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    expect(() => TreeTransferPlanner.move(root, source.id, destinationTypes.id))
      .toThrow('Already exists.')
    expect(sourceTypes.children).toEqual([source])
    expect(destinationTypes.children).toEqual([existing])
  })

  it('rejects a Signature Type Move when a Parameter Type is unavailable there', () => {
    const payload = node(5, ObjectTypeElement.create('Payload', 'payload-type'))
    const source = node(6, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'handler-signature',
      ...SignatureDefinition.create(false, [
        SignatureDefinition.createParameter(
          'payload',
          TypeExpression.createReference(['payload-type']),
          false,
          'payload-parameter',
        ),
      ]),
    })
    const sourceTypes = node(4, TypesElement.create(), [payload, source])
    const destinationTypes = node(9, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes]),
      ]),
      node(7, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(8, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)

    expect(TreeTransferValidator.validateMoveStructure(root, plan.rootNode, source.id))
      .toContain(`node-${source.id}`)
  })

  it('rejects a Signature Type Move that would make a referring Function invalid', () => {
    const source = node(5, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'handler-signature',
      ...SignatureDefinition.create(),
    })
    const functionNode = node(7, referFunction('handle', 'handler-signature'))
    const sourceTypes = node(4, TypesElement.create(), [source])
    const functions = node(6, { kind: 'functions' }, [functionNode])
    const destinationTypes = node(11, TypesElement.create())
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes, functions]),
      ]),
      node(9, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(10, { kind: 'declares' }, [destinationTypes]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationTypes.id)

    expect(TreeTransferValidator.validateMoveStructure(root, plan.rootNode, source.id))
      .toContain(`node-${functionNode.id}`)
  })

  it('moves a Code Function while preserving its identity, Signature, and self call', async () => {
    const signature = SignatureDefinition.create(false, [
      SignatureDefinition.createParameter(
        'value',
        TypeExpression.createObject([
          TypeExpression.createProperty(
            'amount',
            TypeExpression.createPrimitive('number'),
            'amount-property',
          ),
        ]),
        false,
        'value-parameter',
      ),
    ])
    const source = node(5, inlineFunction(
      'calculate',
      signature,
      { mode: 'code', source: 'return $fn.calculate(value)' },
    ))
    const sourceFunctions = node(4, { kind: 'functions' }, [source])
    const destinationFunctions = node(8, { kind: 'functions' })
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceFunctions]),
      ]),
      node(6, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(7, { kind: 'declares' }, [destinationFunctions]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationFunctions.id)
    const moved = TreeNode.findNode(plan.rootNode, source.id)?.element
    if (
      moved?.kind !== 'function'
      || moved.signature.mode !== 'inline'
      || moved.implementation.mode !== 'code'
    ) throw new Error('Expected moved Code Function.')

    expect(sourceFunctions.children).toEqual([source])
    expect(plan.rootNode.children[0].children[0].children[0].children).toEqual([])
    expect(plan.rootNode.children[1].children[0].children[0].children[0].id).toBe(source.id)
    expect(moved.id).toBe('calculate')
    expect(moved.signature.definition.parameters[0].parameterId).toBe('value-parameter')
    const parameterType = TypeExpression.unwrapArray(
      moved.signature.definition.parameters[0].valueType,
    ).base
    if (parameterType.type !== 'object') throw new Error('Expected inline Object parameter.')
    expect(parameterType.properties[0].propertyId).toBe('amount-property')
    expect(moved.implementation.source).toBe('return $fn.calculate(value)')
    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode)).toBeNull()
    expect(await TreeTransferValidator.validateMoveExpressionScope(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
  })

  it('moves a Procedure Function with its local definitions and identities intact', () => {
    const localObject = node(7, ObjectTypeElement.create(
      'Payload',
      'local-object',
      [TypeExpression.createProperty(
        'value',
        TypeExpression.createPrimitive('string'),
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
    const nestedFunction = node(9, referFunction('handle', 'local-signature'))
    const procedure = node(6, FunctionProcedureElement.create(), [
      localObject,
      localSignature,
      nestedFunction,
    ])
    const source = node(5, inlineFunction('process'), [procedure])
    const sourceFunctions = node(4, { kind: 'functions' }, [source])
    const destinationFunctions = node(13, { kind: 'functions' })
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceFunctions]),
      ]),
      node(11, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(12, { kind: 'declares' }, [destinationFunctions]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationFunctions.id)
    const movedObject = TreeNode.findNode(plan.rootNode, localObject.id)?.element
    const movedSignature = TreeNode.findNode(plan.rootNode, localSignature.id)?.element
    const movedFunction = TreeNode.findNode(plan.rootNode, nestedFunction.id)?.element
    if (
      movedObject?.kind !== 'object-type'
      || movedSignature?.kind !== 'signature-type'
      || movedFunction?.kind !== 'function'
      || movedFunction.signature.mode !== 'refer'
    ) throw new Error('Expected moved local definitions.')

    expect(movedObject.typeId).toBe('local-object')
    expect(movedObject.properties[0].propertyId).toBe('local-property')
    expect(movedSignature.typeId).toBe('local-signature')
    expect(movedSignature.parameters[0].parameterId).toBe('local-parameter')
    expect(movedFunction.signature.signatureTypeId).toBe('local-signature')
    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode)).toBeNull()
  })

  it('rejects a Function Move when its Id already exists in the destination scope', () => {
    const source = node(5, inlineFunction('calculate'))
    const existing = node(9, inlineFunction('calculate'))
    const sourceFunctions = node(4, { kind: 'functions' }, [source])
    const destinationFunctions = node(8, { kind: 'functions' }, [existing])
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceFunctions]),
      ]),
      node(6, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(7, { kind: 'declares' }, [destinationFunctions]),
      ]),
    ])

    expect(() => TreeTransferPlanner.move(root, source.id, destinationFunctions.id))
      .toThrow('Already exists.')
    expect(sourceFunctions.children).toEqual([source])
    expect(destinationFunctions.children).toEqual([existing])
  })

  it('rejects a Function Move that would break an external caller', () => {
    const source = node(5, inlineFunction('calculate'))
    const caller = node(6, inlineFunction(
      'caller',
      SignatureDefinition.create(),
      { mode: 'code', source: 'return $fn.calculate()' },
    ))
    const sourceFunctions = node(4, { kind: 'functions' }, [source, caller])
    const destinationFunctions = node(10, { kind: 'functions' })
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceFunctions]),
      ]),
      node(8, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(9, { kind: 'declares' }, [destinationFunctions]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationFunctions.id)

    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode))
      .toContain(`node-${caller.id}`)
  })

  it('rejects a Function Move that would rebind its App State dependency', () => {
    const state = (id: number, initial: string) => node(id, {
      kind: 'state',
      id: 'value',
      valueType: TypeExpression.createPrimitive('number'),
      nullable: false,
      initial: { type: 'literal', value: initial },
    })
    const source = node(7, inlineFunction(
      'readValue',
      SignatureDefinition.create(),
      { mode: 'code', source: 'return $state.value' },
    ))
    const sourceFunctions = node(6, { kind: 'functions' }, [source])
    const destinationFunctions = node(14, { kind: 'functions' })
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'store' }, [node(4, { kind: 'states' }, [state(5, '1')])]),
        node(8, { kind: 'declares' }, [sourceFunctions]),
      ]),
      node(9, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(10, { kind: 'store' }, [node(11, { kind: 'states' }, [state(12, '2')])]),
        node(13, { kind: 'declares' }, [destinationFunctions]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationFunctions.id)

    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode))
      .toContain(`node-${source.id}`)
  })

  it('rejects a Function Move when its referenced Signature is unavailable there', () => {
    const signature = node(5, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'handler-signature',
      ...SignatureDefinition.create(),
    })
    const source = node(7, referFunction('handle', 'handler-signature'))
    const sourceTypes = node(4, TypesElement.create(), [signature])
    const sourceFunctions = node(6, { kind: 'functions' }, [source])
    const destinationFunctions = node(11, { kind: 'functions' })
    const root = node(1, ProjectElement.create(), [
      node(2, { kind: 'app', appId: 'source-app', id: 'source' }, [
        node(3, { kind: 'declares' }, [sourceTypes, sourceFunctions]),
      ]),
      node(9, { kind: 'app', appId: 'destination-app', id: 'destination' }, [
        node(10, { kind: 'declares' }, [destinationFunctions]),
      ]),
    ])

    const plan = TreeTransferPlanner.move(root, source.id, destinationFunctions.id)

    expect(TreeTransferValidator.validateMoveStructure(root, plan.rootNode, source.id))
      .toContain(`node-${source.id}`)
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

  it('moves a Tag with its identity and Ref key without statically resolving Ref collisions', async () => {
    const source = node(4, TagElement.create(
      'button',
      'Save',
      [],
      [{
        type: 'event',
        name: 'click',
        preventDefault: false,
        stopPropagation: false,
        action: { type: 'script', source: "$system.getRef('saveButton')?.focus()" },
      }],
      { type: 'literal', value: 'saveButton' },
    ), [node(5, TagElement.create('span', 'Label'))])
    const existing = node(7, TagElement.create(
      'div',
      'Existing',
      [],
      [],
      { type: 'literal', value: 'saveButton' },
    ))
    const sourceElements = node(3, { kind: 'elements' }, [source])
    const destinationElements = node(6, { kind: 'elements' }, [existing])
    const root = node(1, ProjectElement.create(), [sourceElements, destinationElements])

    const plan = TreeTransferPlanner.move(root, source.id, destinationElements.id)
    const moved = TreeNode.findNode(plan.rootNode, source.id)

    expect(sourceElements.children).toEqual([source])
    expect(plan.rootNode.children[0].children).toEqual([])
    expect(plan.rootNode.children[1].children.map((child) => child.id))
      .toEqual([existing.id, source.id])
    expect(moved?.element).toEqual(source.element)
    expect(moved?.children[0].id).toBe(5)
    expect(TreeTransferValidator.validateMoveStructure(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode)).toBeNull()
    expect(await TreeTransferValidator.validateMoveExpressionScope(
      root,
      plan.rootNode,
      source.id,
    )).toBeNull()
  })

  it('still validates ordinary dependencies used by a moved Tag Ref key formula', () => {
    const prop = (id: number, propId: string) => node(id, {
      kind: 'value-prop',
      propId,
      id: 'refName',
      valueType: TypeExpression.createPrimitive('string'),
      nullable: false,
    })
    const source = node(6, TagElement.create(
      'button',
      'Save',
      [],
      [],
      { type: 'formula', source: '$props.refName' },
    ))
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

    const plan = TreeTransferPlanner.move(root, source.id, destinationElements.id)

    expect(TreeTransferValidator.validateMoveReferenceTargets(root, plan.rootNode))
      .toContain(`node-${source.id}`)
  })

  it('remaps local Style, Component, Prop, and Slot identities in a retained Tag subtree', () => {
    const localAnimation = StyleElement.createAnimation()
    localAnimation.referenceId = 'local-animation-reference'
    localAnimation.keyframesId = 'local-keyframes'
    const localStyle = node(5, StyleElement.create(
      'localCard',
      [],
      [],
      'local-style',
      [{ type: 'animation', mode: 'custom', items: [localAnimation] }],
    ), [
      node(6, { kind: 'style-params' }, [
        node(7, StyleParamElement.create('tone', 'string', undefined, 'local-style-param')),
      ]),
      node(20, { kind: 'style-locals' }, [
        node(21, StyleKeyframesElement.create(
          'fade-in',
          [StyleKeyframesElement.createFrame(0, 'local-frame')],
          'local-keyframes',
        )),
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
    const copiedKeyframes = copiedRetention?.children[0]?.children[1]?.children[0]?.element
    if (copiedKeyframes?.kind !== 'style-keyframes') throw new Error('Expected local Keyframes.')
    expect(copiedKeyframes.keyframesId).not.toBe('local-keyframes')
    expect(copiedKeyframes.frames[0]?.frameId).not.toBe('local-frame')
    expect(copiedStyle.animations?.[0]?.items[0]?.keyframesId).toBe(copiedKeyframes.keyframesId)
    expect(copiedStyle.animations?.[0]?.items[0]?.referenceId)
      .not.toBe('local-animation-reference')
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
