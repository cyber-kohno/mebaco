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
    operation: {
      getPresentation: vi.fn(() => ({
        modeLabel: 'Extract signature',
        dialogTitle: 'Extract signature',
        destinationActionLabel: 'Extract here',
        confirmLabel: 'Extract',
        failureMessage: 'Failed.',
      })),
      isDestinationCandidate: vi.fn(() => true),
      validateName: vi.fn(() => null),
      createSuggestedName: vi.fn(() => 'CalculateSignature'),
      createPlan: vi.fn(),
    },
  }
})

vi.mock('../../store/tree-store', () => ({
  default: {
    rootNode: mocks.rootNode,
    selectedNodeId: mocks.selectedNodeId,
    commitRootChange: mocks.commitRootChange,
  },
}))
vi.mock('../../area/develop/interaction/develop-interaction-controller', () => ({
  default: {
    beginDestinationTransaction: mocks.beginDestinationTransaction,
  },
}))
vi.mock('./tree-destination-operation', () => ({
  default: mocks.operation,
}))

import { developInteractionStore } from '../../area/develop/interaction/develop-interaction-store'
import SignatureDefinition from '../../element/kind/type/signature/signature-definition'
import ExpressionVerificationStore from '../../validation/expression/expression-verification-store'
import type TreeNode from '../tree-node'
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
    })

    expect(await TreeDestinationController.commit('CalculateSignature')).toEqual({ ok: true })

    expect(ExpressionVerificationStore.getStatus(nextRoot, nextFunction)).toBe('verified')
    expect(get(mocks.selectedNodeId)).toBe(signature.id)
    expect(get(developInteractionStore)).toEqual({ type: 'normal' })
  })
})
