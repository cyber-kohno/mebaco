import { beforeEach, describe, expect, it, vi } from 'vitest'
import type MebacoElement from '@system/model/element/element'
import { ConfirmDialogController } from '@system/ui/feedback/confirm'
import type TreeNode from '@system/model/tree/tree-node'
import ElementUpdatePreflight from './element-update-preflight'
import AppSettings from '@system/application/settings/app-settings-store'

vi.mock('@system/ui/feedback/confirm', () => ({
  ConfirmDialogController: {
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
  beforeEach(() => {
    vi.clearAllMocks()
    AppSettings.reset()
  })

  it('keeps the editor update pending when removing a referenced Item is cancelled', async () => {
    AppSettings.setLanguage('ja')
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
      title: 'Loopを更新しますか？',
      choices: [
        { label: 'キャンセル', role: 'cancel' },
        { label: 'そのまま更新', role: 'proceed' },
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
  beforeEach(() => {
    vi.clearAllMocks()
    AppSettings.reset()
  })

  it('blocks an update that removes a stored literal without offering Update Anyway', async () => {
    AppSettings.setLanguage('ja')
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
      title: '更新できません',
      message: [
        'Union Type「Status」は、1個の保存済み項目が無効になるため更新できません。',
        "node-3: state#initial = 'done'",
        'Union Typeを更新する前に、これらの値を変更してください。',
      ],
    })
    expect(ConfirmDialogController.open).not.toHaveBeenCalled()
  })
})
