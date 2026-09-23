import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const createStore = <T>(initial: T) => {
    let value = initial
    const subscribers = new Set<(current: T) => void>()
    return {
      subscribe: (subscriber: (current: T) => void) => {
        subscribers.add(subscriber)
        subscriber(value)
        return () => subscribers.delete(subscriber)
      },
      set: (next: T) => {
        value = next
        subscribers.forEach((subscriber) => subscriber(value))
      },
      update: (updater: (current: T) => T) => {
        value = updater(value)
        subscribers.forEach((subscriber) => subscriber(value))
      },
    }
  }

  const rootNode = createStore<unknown>(null)
  const selectedNodeId = createStore(1)
  return {
    rootNode,
    selectedNodeId,
    commitRootChange: vi.fn((root: unknown) => rootNode.set(root)),
    beginDestinationTransaction: vi.fn(),
    confirmOpen: vi.fn(() => Promise.resolve(true)),
    operation: {
      getPresentation: vi.fn(() => ({
        modeLabel: 'Extract signature',
        dialogTitle: 'Extract signature',
        destinationActionLabel: 'Extract here',
        confirmLabel: 'Extract',
        failureMessage: 'Failed.',
        requiresName: true,
      })),
      isDestinationCandidate: vi.fn(() => true),
      validateName: vi.fn(() => null),
      createSuggestedName: vi.fn(() => 'CalculateSignature'),
      createPlan: vi.fn(),
    },
  }
})

vi.mock('@system/workspace/tree/state', () => ({
  default: {
    rootNode: mocks.rootNode,
    selectedNodeId: mocks.selectedNodeId,
    commitRootChange: mocks.commitRootChange,
  },
}))
vi.mock('@system/workspace/interaction/controller', () => ({
  DevelopInteractionController: {
    beginDestinationTransaction: mocks.beginDestinationTransaction,
  },
}))
vi.mock('@system/ui/feedback/confirm', () => ({
  ConfirmDialogController: { open: mocks.confirmOpen },
}))
vi.mock('./tree-destination-operation', () => ({
  default: mocks.operation,
}))

import { developInteractionStore } from '@system/workspace/interaction/state'
import SignatureDefinition from '@system/model/type-system/signature/signature-definition'
import ObjectType from '@system/model/type-system/object/object-type'
import StyleElement from '@system/model/view/style/style'
import TextElement from '@system/model/view/text'
import { ExpressionVerificationStore } from '@system/workspace/validation/state'
import type TreeNode from '@system/model/tree/tree-node'
import TreeDestinationActionId from './tree-destination-action-id'
import TreeDestinationController from './tree-destination-controller'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const codeFunction = (
  signature: Extract<TreeNode.Node['element'], { kind: 'function' }>['signature'] = {
    mode: 'inline',
    definition: SignatureDefinition.create(),
  },
) => node(3, {
  kind: 'function',
  id: 'calculate',
  signature,
  implementation: { mode: 'code', source: 'return 1' },
})

beforeEach(() => {
  vi.clearAllMocks()
  ExpressionVerificationStore.clear()
  developInteractionStore.set({ type: 'normal' })
})

describe('TreeDestinationController', () => {
  it('adds Copy to a Tag and starts an unnamed copy transaction', () => {
    const tag = node(5, {
      kind: 'tag', tagName: 'div', comment: 'content', styles: [], attributes: [],
    })
    const items = [
      { type: 'action' as const, label: 'Modify', callback: vi.fn() },
      { type: 'action' as const, label: 'Delete', callback: vi.fn() },
    ]

    const next = TreeDestinationController.addCopyAction(items, tag)
    expect(next.map(({ label }) => label)).toEqual(['Modify', 'Copy', 'Delete'])
    const copy = next[1]
    if (copy.type !== 'action') throw new Error('Expected Copy action.')
    expect(copy.actionId).toBe(TreeDestinationActionId.copy)
    copy.callback()

    expect(mocks.beginDestinationTransaction).toHaveBeenCalledWith({
      operation: { type: 'copy', sourceKind: 'tag' },
      sourceNodeId: tag.id,
      sourceLabel: '<div>',
    })
  })

  it('adds unnamed Copy and Move transactions to a Loop', () => {
    const loop = node(5, {
      kind: 'loop', mode: 'count', countSource: '4', indexId: 'index',
    })
    const items = [
      { type: 'action' as const, label: 'Modify', callback: vi.fn() },
      { type: 'action' as const, label: 'Delete', callback: vi.fn() },
    ]

    const copyItems = TreeDestinationController.addCopyAction(items, loop)
    const moveItems = TreeDestinationController.addMoveAction(items, loop)
    expect(copyItems.map(({ label }) => label)).toEqual(['Modify', 'Copy', 'Delete'])
    expect(moveItems.map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])

    const copy = copyItems[1]
    const move = moveItems[1]
    if (copy.type !== 'action' || move.type !== 'action') {
      throw new Error('Expected Loop transfer actions.')
    }
    copy.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenLastCalledWith({
      operation: { type: 'copy', sourceKind: 'loop' },
      sourceNodeId: loop.id,
      sourceLabel: 'loop',
    })
    move.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenLastCalledWith({
      operation: { type: 'move', sourceKind: 'loop' },
      sourceNodeId: loop.id,
      sourceLabel: 'loop',
    })
  })

  it('adds unnamed Copy and Move transactions to Text', () => {
    const text = node(5, TextElement.createLiteral('Hello'))
    const items = [
      { type: 'action' as const, label: 'Modify', callback: vi.fn() },
      { type: 'action' as const, label: 'Delete', callback: vi.fn() },
    ]

    const copyItems = TreeDestinationController.addCopyAction(items, text)
    const moveItems = TreeDestinationController.addMoveAction(items, text)
    expect(copyItems.map(({ label }) => label)).toEqual(['Modify', 'Copy', 'Delete'])
    expect(moveItems.map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])

    const copy = copyItems[1]
    const move = moveItems[1]
    if (copy.type !== 'action' || move.type !== 'action') {
      throw new Error('Expected Text transfer actions.')
    }
    copy.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenLastCalledWith({
      operation: { type: 'copy', sourceKind: 'text' },
      sourceNodeId: text.id,
      sourceLabel: 'text',
    })
    move.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenLastCalledWith({
      operation: { type: 'move', sourceKind: 'text' },
      sourceNodeId: text.id,
      sourceLabel: 'text',
    })
  })

  it('adds Component transfer actions only to regular Components', () => {
    const component = node(6, {
      kind: 'component', componentId: 'component-id', id: 'Card',
    })
    const localComponent = node(7, {
      kind: 'component', componentId: 'local-component-id', id: 'LocalCard', local: true,
    })
    const items = [
      { type: 'action' as const, label: 'Modify', callback: vi.fn() },
      { type: 'action' as const, label: 'Delete', callback: vi.fn() },
    ]

    const copyItems = TreeDestinationController.addCopyAction(items, component)
    const moveItems = TreeDestinationController.addMoveAction(items, component)
    expect(copyItems.map(({ label }) => label)).toEqual(['Modify', 'Copy', 'Delete'])
    expect(moveItems.map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])

    const copy = copyItems[1]
    if (copy.type !== 'action') throw new Error('Expected Copy action.')
    copy.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenLastCalledWith({
      operation: { type: 'copy', sourceKind: 'component' },
      sourceNodeId: component.id,
      sourceLabel: 'Card',
    })

    const move = moveItems[1]
    if (move.type !== 'action') throw new Error('Expected Move action.')
    move.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenLastCalledWith({
      operation: { type: 'move', sourceKind: 'component' },
      sourceNodeId: component.id,
      sourceLabel: 'Card',
    })

    expect(TreeDestinationController.addCopyAction(items, localComponent)).toBe(items)
    expect(TreeDestinationController.addMoveAction(items, localComponent)).toBe(items)
  })

  it('adds Copy but not Move to an App', () => {
    const app = node(8, { kind: 'app', appId: 'app-id', id: 'sample-app' })
    const items = [
      { type: 'action' as const, label: 'Modify', callback: vi.fn() },
      { type: 'action' as const, label: 'Delete', callback: vi.fn() },
    ]

    const copyItems = TreeDestinationController.addCopyAction(items, app)
    expect(copyItems.map(({ label }) => label)).toEqual(['Modify', 'Copy', 'Delete'])
    expect(TreeDestinationController.addMoveAction(items, app)).toBe(items)

    const copy = copyItems[1]
    if (copy.type !== 'action') throw new Error('Expected Copy action.')
    copy.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenLastCalledWith({
      operation: { type: 'copy', sourceKind: 'app' },
      sourceNodeId: app.id,
      sourceLabel: 'sample-app',
    })
  })

  it('marks a valid copy destination with the Paste here action id', () => {
    const source = node(2, {
      kind: 'tag', tagName: 'div', comment: '', styles: [], attributes: [],
    })
    const destination = node(3, { kind: 'elements' })
    const root = node(1, { kind: 'project' }, [source, destination])
    developInteractionStore.set({
      type: 'destination-transaction',
      operation: { type: 'copy', sourceKind: 'tag' },
      phase: 'select-destination',
      sourceNodeId: source.id,
      sourceLabel: '<div>',
      originViewRootNodeId: null,
    })

    const items = TreeDestinationController.getDestinationMenu(root, destination)
    expect(items).toHaveLength(1)
    const paste = items?.[0]
    if (paste?.type !== 'action') throw new Error('Expected Paste here action.')
    expect(paste.actionId).toBe(TreeDestinationActionId.pasteHere)

    paste.callback()
    expect(get(developInteractionStore)).toMatchObject({
      phase: 'confirm',
      destinationNodeId: destination.id,
    })
  })

  it('adds Move to supported kinds and starts an identity-preserving transaction', () => {
    const style = node(5, StyleElement.create('card', [], [], 'style-id'))
    const items = [
      { type: 'action' as const, label: 'Modify', callback: vi.fn() },
      { type: 'action' as const, label: 'Delete', callback: vi.fn() },
    ]

    const next = TreeDestinationController.addMoveAction(items, style)
    expect(next.map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])
    const move = next[1]
    if (move.type !== 'action') throw new Error('Expected Move action.')
    expect(move.actionId).toBe(TreeDestinationActionId.move)
    move.callback()

    expect(mocks.beginDestinationTransaction).toHaveBeenCalledWith({
      operation: { type: 'move', sourceKind: 'style' },
      sourceNodeId: style.id,
      sourceLabel: 'card',
    })

    const tag = node(6, {
      kind: 'tag', tagName: 'div', comment: '', styles: [], attributes: [],
    })
    const tagActions = TreeDestinationController.addMoveAction(items, tag)
    expect(tagActions.map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])
    const tagMove = tagActions[1]
    if (tagMove.type !== 'action') throw new Error('Expected Move action.')
    tagMove.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenLastCalledWith({
      operation: { type: 'move', sourceKind: 'tag' },
      sourceNodeId: tag.id,
      sourceLabel: '<div>',
    })

    const object = node(7, ObjectType.create('Payload', 'payload-type'))
    expect(TreeDestinationController.addMoveAction(items, object)
      .map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])

    const union = node(8, {
      kind: 'union-type',
      id: 'Status',
      typeId: 'status-type',
      definition: { type: 'literal', valueType: 'string', values: ['ready'] },
    })
    expect(TreeDestinationController.addMoveAction(items, union)
      .map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])

    const signature = node(9, {
      kind: 'signature-type',
      id: 'Handler',
      typeId: 'handler-signature',
      ...SignatureDefinition.create(),
    })
    expect(TreeDestinationController.addMoveAction(items, signature)
      .map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])

    expect(TreeDestinationController.addMoveAction(items, codeFunction())
      .map(({ label }) => label)).toEqual(['Modify', 'Move', 'Delete'])
  })

  it('marks a valid Move destination as a Ctrl+V destination command', () => {
    const source = node(2, StyleElement.create('card', [], [], 'style-id'))
    const destination = node(3, { kind: 'retention' })
    const root = node(1, { kind: 'project' }, [source, destination])
    developInteractionStore.set({
      type: 'destination-transaction',
      operation: { type: 'move', sourceKind: 'style' },
      phase: 'select-destination',
      sourceNodeId: source.id,
      sourceLabel: 'card',
      originViewRootNodeId: null,
    })
    mocks.operation.getPresentation.mockReturnValueOnce({
      modeLabel: 'Move',
      dialogTitle: 'Move style',
      destinationActionLabel: 'Move here',
      confirmLabel: 'Move',
      failureMessage: 'Failed.',
      requiresName: false,
    })

    const items = TreeDestinationController.getDestinationMenu(root, destination)
    expect(items).toHaveLength(1)
    expect(items?.[0]).toMatchObject({
      type: 'action',
      label: 'Move here',
      actionId: TreeDestinationActionId.pasteHere,
    })
  })

  it('adds Extract signature only for Inline Functions and starts the shared transaction', () => {
    const inline = codeFunction()
    const refer = codeFunction({ mode: 'refer', signatureTypeId: 'signature-id' })
    const items = [
      { type: 'action' as const, label: 'Modify', callback: vi.fn() },
      { type: 'action' as const, label: 'Delete', callback: vi.fn() },
    ]

    const inlineItems = TreeDestinationController.addSignatureExtractionAction(items, inline)
    expect(inlineItems.map(({ label }) => label)).toEqual([
      'Modify',
      'Extract signature',
      'Delete',
    ])
    const extract = inlineItems[1]
    if (extract.type !== 'action') throw new Error('Expected extraction action.')
    extract.callback()
    expect(mocks.beginDestinationTransaction).toHaveBeenCalledWith({
      operation: { type: 'extract-signature' },
      sourceNodeId: inline.id,
      sourceLabel: 'calculate',
    })

    expect(TreeDestinationController.addSignatureExtractionAction(items, refer)).toBe(items)
  })

  it('starts Extract signature naming with an empty value', () => {
    developInteractionStore.set({
      type: 'destination-transaction',
      operation: { type: 'extract-signature' },
      phase: 'confirm',
      sourceNodeId: 3,
      sourceLabel: 'calculate',
      originViewRootNodeId: null,
      destinationNodeId: 1,
    })

    expect(TreeDestinationController.getSuggestedName()).toBe('')
    expect(mocks.operation.createSuggestedName).not.toHaveBeenCalled()
  })

  it('carries a valid Code Function Verify result across an equivalent transaction', async () => {
    const previousFunction = codeFunction()
    const previousRoot = node(1, { kind: 'project' }, [previousFunction])
    const nextFunction = codeFunction({ mode: 'refer', signatureTypeId: 'signature-id' })
    const signature = node(4, {
      kind: 'signature-type', typeId: 'signature-id', id: 'CalculateSignature',
      ...SignatureDefinition.create(),
    })
    const nextRoot = node(1, { kind: 'project' }, [nextFunction, signature])
    mocks.rootNode.set(previousRoot)
    ExpressionVerificationStore.setResult(previousFunction, {
      status: 'verified',
      messages: [],
    })
    developInteractionStore.set({
      type: 'destination-transaction',
      operation: { type: 'extract-signature' },
      phase: 'confirm',
      sourceNodeId: previousFunction.id,
      sourceLabel: 'calculate',
      originViewRootNodeId: null,
      destinationNodeId: 1,
    })
    mocks.operation.createPlan.mockResolvedValue({
      rootNode: nextRoot,
      selectedNodeId: signature.id,
      preserveVerificationNodeIds: [previousFunction.id],
      invalidateVerification: false,
      warnings: [],
    })

    expect(await TreeDestinationController.commit('CalculateSignature')).toEqual({ ok: true })

    expect(ExpressionVerificationStore.getStatus(nextRoot, nextFunction)).toBe('verified')
    expect(get(mocks.selectedNodeId)).toBe(signature.id)
    expect(get(developInteractionStore)).toEqual({ type: 'normal' })
  })

  it('invalidates cached expression verification after a Move', async () => {
    const functionNode = codeFunction()
    const previousRoot = node(1, { kind: 'project' }, [functionNode])
    const nextRoot = node(1, { kind: 'project' }, [functionNode])
    mocks.rootNode.set(previousRoot)
    ExpressionVerificationStore.setResult(functionNode, {
      status: 'verified',
      messages: [],
    })
    developInteractionStore.set({
      type: 'destination-transaction',
      operation: { type: 'move', sourceKind: 'style' },
      phase: 'confirm',
      sourceNodeId: 5,
      sourceLabel: 'card',
      originViewRootNodeId: null,
      destinationNodeId: 6,
    })
    mocks.operation.createPlan.mockResolvedValue({
      rootNode: nextRoot,
      selectedNodeId: 5,
      preserveVerificationNodeIds: [],
      invalidateVerification: true,
      warnings: [],
    })

    expect(await TreeDestinationController.commit('')).toEqual({ ok: true })
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
  })

  it('confirms Move warnings before committing the candidate tree', async () => {
    const previousRoot = node(1, { kind: 'project' })
    const nextRoot = node(1, { kind: 'project' }, [
      node(5, StyleElement.create('card', [], [], 'style-id')),
    ])
    mocks.rootNode.set(previousRoot)
    developInteractionStore.set({
      type: 'destination-transaction',
      operation: { type: 'move', sourceKind: 'style' },
      phase: 'confirm',
      sourceNodeId: 5,
      sourceLabel: 'card',
      originViewRootNodeId: null,
      destinationNodeId: 6,
    })
    mocks.operation.createPlan.mockResolvedValue({
      rootNode: nextRoot,
      selectedNodeId: 5,
      preserveVerificationNodeIds: [],
      invalidateVerification: true,
      warnings: [{
        type: 'reference-target-changed',
        nodeId: 8,
        sourceLabel: 'action#source',
      }],
    })

    expect(await TreeDestinationController.commit('')).toEqual({ ok: true })
    expect(mocks.confirmOpen).toHaveBeenCalledWith(expect.objectContaining({
      tone: 'warning',
      title: 'Move with expression errors?',
      choices: [
        { label: 'Cancel', role: 'cancel' },
        { label: 'Move Anyway', role: 'proceed' },
      ],
    }))
    expect(mocks.commitRootChange).toHaveBeenCalledWith(nextRoot)
  })

  it('keeps the Move transaction open when its warning is cancelled', async () => {
    const previousRoot = node(1, { kind: 'project' })
    const nextRoot = node(1, { kind: 'project' })
    mocks.rootNode.set(previousRoot)
    developInteractionStore.set({
      type: 'destination-transaction',
      operation: { type: 'move', sourceKind: 'style' },
      phase: 'confirm',
      sourceNodeId: 5,
      sourceLabel: 'card',
      originViewRootNodeId: null,
      destinationNodeId: 6,
    })
    mocks.operation.createPlan.mockResolvedValue({
      rootNode: nextRoot,
      selectedNodeId: 5,
      preserveVerificationNodeIds: [],
      invalidateVerification: true,
      warnings: [{
        type: 'expression-invalid',
        nodeId: 8,
        details: ['The moved expression is invalid.'],
      }],
    })
    mocks.confirmOpen.mockResolvedValueOnce(false)

    expect(await TreeDestinationController.commit(''))
      .toEqual({ ok: false, cancelled: true })
    expect(mocks.commitRootChange).not.toHaveBeenCalled()
    expect(get(developInteractionStore)).toMatchObject({
      type: 'destination-transaction',
      phase: 'confirm',
    })
  })
})
