import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ContentActions from '../element/content-actions'
import FunctionActions from '../element/function-actions'
import { elementDialogStore } from '../element-dialog/element-dialog-store'
import type TreeNode from '../tree/tree-node'
import AppSettings from './app-settings-store'

vi.mock('../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    transformNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))

const root: TreeNode.Node = {
  id: 1,
  element: { kind: 'project' },
  isOpen: true,
  children: [],
}

afterEach(() => {
  AppSettings.reset()
  elementDialogStore.set(null)
})

describe('element creation settings', () => {
  it('uses the configured Loop index variable for new Loop dialogs', () => {
    AppSettings.setLoopIndexVariableName('i')
    const menu = ContentActions.createAddDirectiveMenu(root.id, root)
    const item = menu.children.find((candidate) => candidate.label === 'Loop')
    expect(item?.type).toBe('action')
    if (item?.type !== 'action') return

    item.callback()

    const session = get(elementDialogStore)
    expect(session?.mode).toBe('create')
    expect(session?.schema.fields.find((field) => field.key === 'indexId'))
      .toMatchObject({ defaultValue: 'i' })
  })

  it('uses the configured Function signature mode for new Function dialogs', () => {
    AppSettings.setFunctionSignatureMode('refer')
    const item = FunctionActions.createAddFunctionItem(root.id, root)

    item.callback()

    const session = get(elementDialogStore)
    expect(session?.mode).toBe('create')
    expect(session?.schema.fields.find((field) => field.key === 'signatureMode'))
      .toMatchObject({ defaultValue: 'refer' })
  })
})
