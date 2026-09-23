import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import { elementDialogStore } from '@system/workspace/element-editor/element-dialog-store'
import type TreeNode from '@system/model/tree/tree-node'
import AppSettings from './app-settings-store'

vi.mock('@system/workspace/tree/state', () => ({
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
  it('uses the configured Loop variable names for new Loop dialogs', () => {
    AppSettings.setLoopItemVariableName('entry')
    AppSettings.setLoopIndexVariableName('i')
    const menu = ContentActions.createAddDirectiveMenu(root.id, root)
    const item = menu.children.find((candidate) => candidate.label === 'Loop')
    expect(item?.type).toBe('action')
    if (item?.type !== 'action') return

    item.callback()

    const session = get(elementDialogStore)
    expect(session?.mode).toBe('create')
    expect(session?.schema.fields.find((field) => field.key === 'itemId'))
      .toMatchObject({ defaultValue: 'entry' })
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

  it('uses inline implementation by default for new Function dialogs', () => {
    const item = FunctionActions.createAddFunctionItem(root.id, root)

    item.callback()

    const session = get(elementDialogStore)
    expect(session?.schema.fields.find((field) => field.key === 'implementationMode'))
      .toMatchObject({ defaultValue: 'code' })
  })

  it('uses the configured Function implementation mode for new Function dialogs', () => {
    AppSettings.setFunctionImplementationMode('procedure')
    const item = FunctionActions.createAddFunctionItem(root.id, root)

    item.callback()

    const session = get(elementDialogStore)
    expect(session?.schema.fields.find((field) => field.key === 'implementationMode'))
      .toMatchObject({ defaultValue: 'procedure' })
  })
})
