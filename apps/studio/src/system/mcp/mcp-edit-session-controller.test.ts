import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import { clearLanguagePreview, setLanguagePreview, translateFor } from '@system/application/localization'
import McpEditSessionState from './mcp-edit-session-state'

const dialog = vi.hoisted(() => ({ open: vi.fn(), openNotice: vi.fn() }))
vi.mock('@system/ui/feedback/confirm/confirm-dialog-controller', () => ({ default: dialog }))
vi.mock('@system/workspace/history/edit-history-controller', () => ({ default: { createCheckpoint: vi.fn(), discardCheckpoint: vi.fn(), rollbackCheckpoint: vi.fn() } }))
vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: { show: vi.fn() } }))
vi.mock('@system/workspace/tree/state', () => ({ default: { revision: { subscribe: (run: (revision: number) => void) => { run(3); return () => {} } } } }))

import McpEditSessionController from './mcp-edit-session-controller'
import EditHistoryController from '@system/workspace/history/edit-history-controller'
import ToastController from '@system/ui/feedback/toast/toast-controller'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import { elementDialogStore } from '@system/workspace/element-editor/element-dialog-store'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import type MebacoElement from '@system/model/element/element'

const element: MebacoElement.Element = { kind: 'text', source: { type: 'literal', value: 'saved' } }
const schema: ElementEditSchema.Schema<MebacoElement.Element> = {
  createTitle: 'Create', updateTitle: 'Update', fields: [],
  getInitialValues: () => ({ value: 'saved' }), create: vi.fn(() => element), update: vi.fn(() => element),
}
const openElementDialog = (mode: 'create' | 'update') => {
  if (mode === 'create') ElementDialog.openCreate(1, schema)
  else ElementDialog.openUpdate(1, element, schema)
  return get(elementDialogStore)!
}

describe('Manual release from the unified MCP badge', () => {
  beforeEach(() => { vi.clearAllMocks(); McpEditSessionState.reset(); ElementDialog.close(); setLanguagePreview('ja') })
  afterEach(() => { McpEditSessionState.reset(); ElementDialog.close(); clearLanguagePreview() })

  it.each(['ja', 'en'] as const)('omits file-saving reminders from agent messages in %s', (language) => {
    for (const key of ['mcp.edit.completed.message', 'mcp.edit.release.message', 'mcp.edit.released.message', 'mcp.edit.cancelled.message'] as const) {
      expect(translateFor(language, key)).not.toMatch(/保存|書き込み|\bsav(?:e|ed|ing|es)\b|\bfile\b|\bwrit(?:e|ten|ing|es)\b/i)
    }
  })

  it.each(['create', 'update'] as const)('closes a %s draft before the completion notice without applying it or awaiting OK', async (mode) => {
    const checkout = McpEditSessionState.checkout('session', 0)
    const session = openElementDialog(mode)
    dialog.openNotice.mockImplementation(() => {
      expect(get(elementDialogStore)).toBeNull()
      return new Promise(() => {})
    })
    const checkin = McpEditSessionController.checkin('session', checkout.checkoutId, 3)
    expect(get(elementDialogStore)).toBeNull()
    expect(ElementDialog.isCurrent(session)).toBe(false)
    expect(dialog.openNotice).not.toHaveBeenCalled()
    await expect(checkin).resolves.toMatchObject({ status: 'idle', revision: 3 })
    expect(dialog.openNotice).toHaveBeenCalledOnce()
    expect(schema.create).not.toHaveBeenCalled()
    expect(schema.update).not.toHaveBeenCalled()
    expect(dialog.open).not.toHaveBeenCalled()
  })

  it.each([
    ['ja', 'エージェントの作業が完了しました'],
    ['en', 'Agent work completed'],
  ] as const)('shows the completed notice in %s even without an element dialog', async (language, title) => {
    setLanguagePreview(language)
    const checkout = McpEditSessionState.checkout('session', 0)
    await McpEditSessionController.checkin('session', checkout.checkoutId, 3)
    expect(dialog.openNotice).toHaveBeenCalledWith(expect.objectContaining({ title }))
  })

  it('does not close a draft or show a notice for a rejected checkin', async () => {
    const checkout = McpEditSessionState.checkout('session', 0)
    const session = openElementDialog('update')
    await expect(McpEditSessionController.checkin('session', 'foreign', 3)).rejects.toThrow('does not belong')
    expect(get(elementDialogStore)).toBe(session)
    expect(get(McpEditSessionState.store)).toEqual(checkout)
    expect(dialog.openNotice).not.toHaveBeenCalled()
  })

  it('does nothing outside an edit session', async () => {
    await McpEditSessionController.release()
    expect(dialog.open).not.toHaveBeenCalled()
  })

  it('keeps the owner when release is cancelled', async () => {
    const checkout = McpEditSessionState.checkout('session', 0)
    const session = openElementDialog('update')
    dialog.open.mockResolvedValue(false)
    await McpEditSessionController.release()
    expect(get(McpEditSessionState.store)).toEqual(checkout)
    expect(get(elementDialogStore)).toBe(session)
    expect(dialog.openNotice).not.toHaveBeenCalled()
  })

  it.each([
    ['ja', 'エージェントの編集セッションを解除しますか？', '編集セッションを解除しました', '編集内容を維持して終了', 'この操作ではエージェントは停止しません', '現在の編集内容は維持されています'],
    ['en', 'Release the agent edit session?', 'Edit session released', 'Keep edits and finish', 'This does not stop the agent', 'Current edits have been kept'],
  ] as const)('confirms release and shows a notice in %s', async (language, title, noticeTitle, keepLabel, confirmationMessage, noticeMessage) => {
    setLanguagePreview(language)
    McpEditSessionState.checkout('session', 0)
    openElementDialog('update')
    dialog.open.mockResolvedValue(true)
    const checkin = vi.spyOn(McpEditSessionState, 'checkin')
    await McpEditSessionController.release()
    expect(dialog.open).toHaveBeenCalledWith(expect.objectContaining({
      title, tone: 'warning', message: expect.stringContaining(confirmationMessage),
      choices: expect.arrayContaining([expect.objectContaining({ label: keepLabel })]),
    }))
    expect(checkin).toHaveBeenCalledWith('session', expect.any(String), 3)
    expect(get(McpEditSessionState.store)).toBeNull()
    expect(get(elementDialogStore)).toBeNull()
    expect(dialog.openNotice).toHaveBeenCalledWith(expect.objectContaining({ title: noticeTitle, message: expect.stringContaining(noticeMessage) }))
  })

  it('reports native checkpoint disposal failure without unlocking or discarding the draft', async () => {
    const owner = McpEditSessionState.checkout('session', 0)
    McpEditSessionState.markCheckpointReady(owner.checkoutId, 'session')
    const session = openElementDialog('update')
    dialog.open.mockResolvedValue(true)
    vi.mocked(EditHistoryController.discardCheckpoint).mockRejectedValueOnce(new Error('native error'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(McpEditSessionController.release()).resolves.toBeUndefined()
      expect(get(McpEditSessionState.store)).toEqual(owner)
      expect(get(elementDialogStore)).toBe(session)
      expect(dialog.openNotice).not.toHaveBeenCalled()
      expect(ToastController.show).toHaveBeenCalledWith(expect.stringContaining('解除できませんでした'), expect.objectContaining({ tone: 'danger' }))
    } finally { log.mockRestore() }
  })

  it('does not release a new checkout after the confirmation was opened', async () => {
    const previous = McpEditSessionState.checkout('session', 0)
    let confirm!: (accepted: boolean) => void
    dialog.open.mockImplementation(() => new Promise((resolve) => { confirm = resolve }))
    const release = McpEditSessionController.release()
    McpEditSessionState.checkin('session', previous.checkoutId, 0)
    const current = McpEditSessionState.checkout('session', 0)
    const session = openElementDialog('create')
    confirm(true)
    await release
    expect(get(McpEditSessionState.store)).toEqual(current)
    expect(get(elementDialogStore)).toBe(session)
    expect(dialog.openNotice).not.toHaveBeenCalled()
  })
})
