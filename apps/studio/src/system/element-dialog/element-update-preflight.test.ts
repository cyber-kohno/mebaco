import { beforeEach, describe, expect, it, vi } from 'vitest'
import type MebacoElement from '../element/element'
import ConfirmDialogController from '../feedback/confirm/confirm-dialog-controller'
import type TreeNode from '../tree/tree-node'
import ElementUpdatePreflight from './element-update-preflight'

vi.mock('../feedback/confirm/confirm-dialog-controller', () => ({
  default: {
    open: vi.fn(() => Promise.resolve(false)),
    openNotice: vi.fn(() => Promise.resolve()),
  },
}))

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

describe('ElementUpdatePreflight Loop confirmation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the editor update pending when removing a referenced Item is cancelled', async () => {
    const child = node(3, { kind: 'if', condition: '$var.item != null' })
    const loop = node(2, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'index',
    }, [child])
    const root = node(1, { kind: 'project' }, [loop])
    const previous = loop.element as Extract<MebacoElement.Element, { kind: 'loop' }>
    const next: Extract<MebacoElement.Element, { kind: 'loop' }> = {
      kind: 'loop',
      mode: 'count',
      countSource: '1',
      indexId: 'index',
    }

    vi.mocked(ConfirmDialogController.open).mockResolvedValueOnce(false)
    await expect(ElementUpdatePreflight.confirm(root, loop.id, previous, next))
      .resolves.toBe(false)
    expect(ConfirmDialogController.open).toHaveBeenCalledWith(expect.objectContaining({
      tone: 'danger',
      title: 'Update Loop?',
      choices: [
        { label: 'Cancel', role: 'cancel' },
        { label: 'Update Anyway', role: 'proceed' },
      ],
    }))
  })

  it('does not ask for confirmation when the removed Item has no references', async () => {
    const loop = node(2, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '[]',
      itemId: 'item',
      indexId: 'index',
    })
    const root = node(1, { kind: 'project' }, [loop])
    const previous = loop.element as Extract<MebacoElement.Element, { kind: 'loop' }>

    await expect(ElementUpdatePreflight.confirm(root, loop.id, previous, {
      kind: 'loop',
      mode: 'count',
      countSource: '1',
      indexId: 'index',
    })).resolves.toBe(true)
    expect(ConfirmDialogController.open).not.toHaveBeenCalled()
  })
})

describe('ElementUpdatePreflight Union validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks an update that removes a stored literal without offering Update Anyway', async () => {
    const previous: Extract<MebacoElement.Element, { kind: 'union-type' }> = {
      kind: 'union-type', typeId: 'status-type', id: 'Status',
      definition: { type: 'literal', valueType: 'string', values: ['ready', 'done'] },
    }
    const unionNode = node(2, previous)
    const root = node(1, { kind: 'project' }, [
      unionNode,
      node(3, {
        kind: 'state', id: 'status',
        valueType: { type: 'named', namedTypeId: 'status-type' },
        nullable: false, initial: { type: 'literal', value: 'done' },
      }),
    ])

    await expect(ElementUpdatePreflight.confirm(root, unionNode.id, previous, {
      ...previous,
      definition: { type: 'literal', valueType: 'string', values: ['ready'] },
    })).resolves.toBe(false)
    expect(ConfirmDialogController.openNotice).toHaveBeenCalledWith({
      title: 'Update Blocked',
      message: [
        "Union Type 'Status' cannot be updated because 1 saved item would become invalid.",
        "node-3: state#initial = 'done'",
        'Change these values before updating the Union Type.',
      ],
    })
    expect(ConfirmDialogController.open).not.toHaveBeenCalled()
  })
})
