import { describe, expect, it, vi } from 'vitest'

vi.mock('../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))
vi.mock('../transfer/tree-transfer-validator', () => ({
  default: {
    validateStructure: vi.fn(() => null),
    validateReferenceTargets: vi.fn(() => null),
    validateExpressionScope: vi.fn(() => Promise.resolve(null)),
  },
}))

import type DevelopInteractionMode from '../../area/develop/interaction/develop-interaction-mode'
import type TreeNode from '../tree-node'
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

  it('provides operation-specific names and presentation from the shared registry', () => {
    const extraction: DevelopInteractionMode.DestinationTransaction = {
      type: 'destination-transaction',
      operation: { type: 'extract-signature' },
      phase: 'select-destination',
      sourceNodeId: 3,
      sourceLabel: 'saveUser',
      originViewRootNodeId: null,
    }

    expect(TreeDestinationOperation.createSuggestedName(extraction, 1))
      .toBe('SaveUserSignature')
    expect(TreeDestinationOperation.createSuggestedName(extraction, 2))
      .toBe('SaveUserSignature2')
    expect(TreeDestinationOperation.getPresentation(extraction)).toMatchObject({
      modeLabel: 'Extract signature',
      destinationActionLabel: 'Extract here',
      confirmLabel: 'Extract',
    })
  })
})
