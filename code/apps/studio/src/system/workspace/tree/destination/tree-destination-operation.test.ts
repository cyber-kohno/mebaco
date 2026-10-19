import { describe, expect, it, vi } from 'vitest'

vi.mock('@system/workspace/tree/state', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))
vi.mock('@system/workspace/tree/transfer/validator', () => ({
  TreeTransferValidator: {
    validateStructure: vi.fn(() => null),
    validateReferenceTargets: vi.fn(() => null),
    validateExpressionScope: vi.fn(() => Promise.resolve(null)),
    validateMoveStructure: vi.fn(() => null),
    validateMoveReferenceTargets: vi.fn(() => null),
    validateMoveExpressionScope: vi.fn(() => Promise.resolve(null)),
    findMoveReferenceTargetChange: vi.fn(() => null),
    inspectMoveExpressionScope: vi.fn(() => Promise.resolve(null)),
  },
}))

import type { DevelopInteractionMode } from '@system/workspace/interaction/mode'
import RetentionElement from '@system/model/component/retention'
import StyleElement from '@system/model/view/style/style'
import type TreeNode from '@system/model/tree/tree-node'
import { TreeTransferValidator } from '@system/workspace/tree/transfer/validator'
import TreeDestinationOperation from './tree-destination-operation'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('TreeDestinationOperation', () => {
  it('runs Copy through the shared destination transaction plan', async () => {
    const source = node(3, {
      kind: 'object-type', typeId: 'source-type', id: 'User',
      properties: [], baseObjectIds: [],
    })
    const types = node(2, { kind: 'types' }, [source])
    const root = node(1, { kind: 'project' }, [types])
    const session: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'copy', sourceKind: 'object-type' },
      phase: 'confirm',
      sourceNodeId: source.id,
      sourceLabel: 'User',
      originViewRootNodeId: null,
      destinationNodeId: types.id,
    }

    const plan = await TreeDestinationOperation.createPlan(root, session, 'UserCopy')
    const copied = plan.rootNode.children[0].children[1]
    expect(copied.element).toMatchObject({ kind: 'object-type', id: 'UserCopy' })
    expect(plan.selectedNodeId).toBe(copied.id)
    expect(plan.preserveVerificationNodeIds).toEqual([])
    expect(plan.invalidateVerification).toBe(false)
    expect(plan.warnings).toEqual([])
  })

  it('moves a Style through the shared destination transaction without requesting a name', async () => {
    const source = node(3, StyleElement.create('card', [], [], 'style-id'))
    const styles = node(2, { kind: 'styles' }, [source])
    const destination = node(4, RetentionElement.create())
    const root = node(1, { kind: 'project' }, [styles, destination])
    const session: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'move', sourceKind: 'style' },
      phase: 'confirm',
      sourceNodeId: source.id,
      sourceLabel: 'card',
      originViewRootNodeId: null,
      destinationNodeId: destination.id,
    }

    expect(TreeDestinationOperation.getPresentation(session)).toMatchObject({
      modeLabel: 'Move',
      destinationActionLabel: 'Move here',
      confirmLabel: 'Move',
      requiresName: false,
    })
    expect(TreeDestinationOperation.validateName(root, destination, session, '')).toBeNull()
    expect(TreeDestinationOperation.createSuggestedName(session, 1)).toBe('')

    const plan = await TreeDestinationOperation.createPlan(root, session, 'ignored')
    expect(plan.rootNode.children[0].children).toEqual([])
    expect(plan.rootNode.children[1].children[0].id).toBe(source.id)
    expect(plan.selectedNodeId).toBe(source.id)
    expect(plan.preserveVerificationNodeIds).toEqual([])
    expect(plan.invalidateVerification).toBe(true)
    expect(plan.warnings).toEqual([])
  })

  it('copies a Tag without requesting or assigning a name', async () => {
    const source = node(3, {
      kind: 'tag', tagName: 'div', comment: 'content', styles: [], attributes: [],
    })
    const elements = node(2, { kind: 'elements' }, [source])
    const root = node(1, { kind: 'project' }, [elements])
    const session: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'copy', sourceKind: 'tag' },
      phase: 'confirm',
      sourceNodeId: source.id,
      sourceLabel: '<div>',
      originViewRootNodeId: null,
      destinationNodeId: elements.id,
    }

    expect(TreeDestinationOperation.getPresentation(session).requiresName).toBe(false)
    expect(TreeDestinationOperation.createSuggestedName(session, 1)).toBe('')
    expect(TreeDestinationOperation.validateName(root, elements, session, '')).toBeNull()

    const plan = await TreeDestinationOperation.createPlan(root, session, 'ignored')
    expect(plan.rootNode.children[0].children[1].element).toEqual(source.element)
  })

  it('suggests a valid kebab-case name when copying an App', () => {
    const session: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'copy', sourceKind: 'app' },
      phase: 'select-destination',
      sourceNodeId: 3,
      sourceLabel: 'sample-app',
      originViewRootNodeId: null,
    }

    expect(TreeDestinationOperation.createSuggestedName(session, 1)).toBe('sample-app-copy')
    expect(TreeDestinationOperation.createSuggestedName(session, 2)).toBe('sample-app-copy-2')
    expect(TreeDestinationOperation.createSuggestedName({
      ...session,
      sourceLabel: 'abcdefghijklmnopqrstuvwxyzabcdef',
    }, 1)).toBe('abcdefghijklmnopqrstuvwxyza-copy')
  })

  it('suggests a kebab-case name when copying a Bundle', () => {
    const session: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'copy', sourceKind: 'bundle' },
      phase: 'select-destination',
      sourceNodeId: 3,
      sourceLabel: 'desktop',
      originViewRootNodeId: null,
    }

    expect(TreeDestinationOperation.createSuggestedName(session, 1)).toBe('desktop-copy')
    expect(TreeDestinationOperation.createSuggestedName(session, 2)).toBe('desktop-copy-2')
  })

  it('moves a Tag without requesting or assigning a name', async () => {
    const source = node(3, {
      kind: 'tag', tagName: 'button', comment: 'Save', styles: [], attributes: [],
      refKey: { type: 'literal', value: 'saveButton' },
    })
    const sourceElements = node(2, { kind: 'elements' }, [source])
    const destinationElements = node(4, { kind: 'elements' })
    const root = node(1, { kind: 'project' }, [sourceElements, destinationElements])
    const session: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'move', sourceKind: 'tag' },
      phase: 'confirm',
      sourceNodeId: source.id,
      sourceLabel: '<button>',
      originViewRootNodeId: null,
      destinationNodeId: destinationElements.id,
    }

    expect(TreeDestinationOperation.getPresentation(session).requiresName).toBe(false)
    expect(TreeDestinationOperation.createSuggestedName(session, 1)).toBe('')
    expect(TreeDestinationOperation.validateName(root, destinationElements, session, '')).toBeNull()

    const plan = await TreeDestinationOperation.createPlan(root, session, 'ignored')
    expect(plan.rootNode.children[0].children).toEqual([])
    expect(plan.rootNode.children[1].children[0]).toMatchObject({
      id: source.id,
      element: source.element,
    })
    expect(plan.selectedNodeId).toBe(source.id)
    expect(plan.invalidateVerification).toBe(true)
  })

  it('returns expression reference and verification problems as Move warnings', async () => {
    const source = node(3, StyleElement.create('card', [], [], 'style-id'))
    const styles = node(2, { kind: 'styles' }, [source])
    const destination = node(4, RetentionElement.create())
    const root = node(1, { kind: 'project' }, [styles, destination])
    const session: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'move', sourceKind: 'style' },
      phase: 'confirm',
      sourceNodeId: source.id,
      sourceLabel: 'card',
      originViewRootNodeId: null,
      destinationNodeId: destination.id,
    }
    vi.mocked(TreeTransferValidator.findMoveReferenceTargetChange)
      .mockReturnValueOnce({
        type: 'reference-target-changed',
        nodeId: 8,
        sourceLabel: 'action#source',
      })
    vi.mocked(TreeTransferValidator.inspectMoveExpressionScope)
      .mockResolvedValueOnce({
        type: 'expression-invalid',
        nodeId: 8,
        details: ['The moved expression is invalid in this scope.'],
      })

    const plan = await TreeDestinationOperation.createPlan(root, session, '')

    expect(plan.warnings).toEqual([
      {
        type: 'reference-target-changed',
        nodeId: 8,
        sourceLabel: 'action#source',
      },
      {
        type: 'expression-invalid',
        nodeId: 8,
        details: ['The moved expression is invalid in this scope.'],
      },
    ])
  })

  it('still rejects a Move that changes a structural reference target', async () => {
    const source = node(3, StyleElement.create('card', [], [], 'style-id'))
    const styles = node(2, { kind: 'styles' }, [source])
    const destination = node(4, RetentionElement.create())
    const root = node(1, { kind: 'project' }, [styles, destination])
    const session: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'move', sourceKind: 'style' },
      phase: 'confirm',
      sourceNodeId: source.id,
      sourceLabel: 'card',
      originViewRootNodeId: null,
      destinationNodeId: destination.id,
    }
    vi.mocked(TreeTransferValidator.validateMoveReferenceTargets)
      .mockImplementationOnce((_previous, _candidate, sourceType) => (
        sourceType === 'structural' ? 'A structural reference would change.' : null
      ))

    await expect(TreeDestinationOperation.createPlan(root, session, ''))
      .rejects.toThrow('A structural reference would change.')
  })

  it('leaves Extract signature naming to the developer', () => {
    const extraction: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'extract-signature' },
      phase: 'select-destination',
      sourceNodeId: 3,
      sourceLabel: 'saveUser',
      originViewRootNodeId: null,
    }

    expect(TreeDestinationOperation.createSuggestedName(extraction, 1)).toBe('')
    expect(TreeDestinationOperation.createSuggestedName(extraction, 2)).toBe('')
    expect(TreeDestinationOperation.getPresentation(extraction)).toMatchObject({
      modeLabel: 'Extract signature',
      destinationActionLabel: 'Extract here',
      confirmLabel: 'Extract',
    })
  })
})
