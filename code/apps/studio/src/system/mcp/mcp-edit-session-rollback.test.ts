import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import TreeStore from '@system/workspace/tree/state'
import TreeViewportController from '@system/workspace/tree/tree-viewport-controller'
import TreeNode from '@system/model/tree/tree-node'
import EditHistoryController from '@system/workspace/history/edit-history-controller'
import McpEditSessionState from './mcp-edit-session-state'
import McpEditSessionController from './mcp-edit-session-controller'
import McpSessionState from './mcp-session-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import { elementDialogStore } from '@system/workspace/element-editor/element-dialog-store'
import { clearLanguagePreview, setLanguagePreview } from '@system/application/localization'

const native = vi.hoisted(() => ({ clear: vi.fn(), record: vi.fn(), undo: vi.fn(), redo: vi.fn(), createCheckpoint: vi.fn(), getCheckpoint: vi.fn(), finishCheckpoint: vi.fn(), commitCheckpoint: vi.fn() }))
const notice = vi.hoisted(() => vi.fn())
const confirmation = vi.hoisted(() => vi.fn())
vi.mock('@system/infra/tauri/edit-history', () => ({ default: native }))
vi.mock('@system/ui/feedback/confirm/confirm-dialog-controller', () => ({ default: { openNotice: notice, open: confirmation } }))
vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: { show: vi.fn() } }))

const tag = { kind: 'tag' as const, tagName: 'div' as const, comment: '', styles: [], attributes: [] }
const initial = (): TreeNode.Node => ({ id: 1, element: tag, isOpen: true, children: [{ id: 2, element: tag, isOpen: false, children: [] }] })

describe('Rust checkpoint / live TreeStore rollback integration', () => {
  let disconnect: () => void
  let checkpoint: { id: string; snapshot: string; undo: string[]; redo: string[] } | null
  let undo: string[]
  let redo: string[]
  beforeEach(async () => {
    vi.resetAllMocks()
    McpEditSessionState.reset()
    ElementDialog.close()
    setLanguagePreview('ja')
    TreeStore.replaceRoot(initial())
    checkpoint = null; undo = []; redo = []
    native.clear.mockImplementation(async () => { checkpoint = null; undo = []; redo = [] })
    native.record.mockImplementation(async (snapshot: string) => { undo.push(snapshot); redo = [] })
    native.undo.mockImplementation(async (current: string) => { const value = undo.pop(); if (value == null) return null; redo.push(current); return value })
    native.redo.mockImplementation(async (current: string) => { const value = redo.pop(); if (value == null) return null; undo.push(current); return value })
    native.createCheckpoint.mockImplementation(async (id: string, snapshot: string) => { checkpoint = { id, snapshot, undo: [...undo], redo: [...redo] } })
    native.getCheckpoint.mockImplementation(async (id: string) => { if (checkpoint?.id !== id) throw new Error('wrong owner'); return checkpoint.snapshot })
    native.finishCheckpoint.mockImplementation(async (id: string, rollback: boolean, changed = false) => {
      if (checkpoint?.id !== id) throw new Error('wrong owner')
      if (rollback) { undo = checkpoint.undo; redo = checkpoint.redo }
      else if (changed) { undo = [...checkpoint.undo, checkpoint.snapshot]; redo = [] }
      checkpoint = null
    })
    native.commitCheckpoint.mockImplementation(async (id: string, changed: boolean) => native.finishCheckpoint(id, false, changed))
    disconnect = EditHistoryController.connect()
    await vi.waitFor(() => expect(native.clear).toHaveBeenCalledOnce())
  })
  afterEach(() => { disconnect(); McpEditSessionState.reset(); ElementDialog.close(); clearLanguagePreview() })

  const edit = (checkoutId: string) => TreeStore.transaction({ source: 'mcp', label: 'Agent edit', checkoutId, expectedRevision: get(TreeStore.revision) }, () => TreeStore.toggleDisabled(2))

  it.each([['ja', 'エージェントの変更を取り消しました'], ['en', 'Agent changes rolled back']] as const)('restores content, selection, expansion and Criteria; preserves prior history in %s', async (locale, title) => {
    setLanguagePreview(locale)
    TreeStore.toggleDisabled(2) // Pre-existing human edit must remain undoable.
    TreeStore.selectedNodeId.set(2)
    TreeViewportController.setViewRootNodeId(get(TreeStore.rootNode), 2)
    const baseline = JSON.parse(JSON.stringify(get(TreeStore.rootNode)))
    const owner = await McpEditSessionController.checkout('session', 1)
    expect(owner).toMatchObject({ rollbackAvailable: true, revision: 1, operation: null })
    expect(native.createCheckpoint).toHaveBeenCalledOnce()
    edit(owner.checkoutId!)
    expect(get(TreeStore.revision)).toBe(2)
    expect(TreeNode.findNode(get(TreeStore.rootNode), 2)?.disabled).toBe(false)
    TreeStore.selectedNodeId.set(1)
    TreeViewportController.setViewRootNodeId(get(TreeStore.rootNode), null)
    TreeStore.rootNode.update((root) => ({ ...root, isOpen: false })) // Navigation is not a content revision.
    ElementDialog.openUpdate(2, tag, { createTitle: 'Create', updateTitle: 'Update', fields: [], getInitialValues: () => ({}), create: () => tag, update: () => tag })
    notice.mockImplementation(() => { expect(get(elementDialogStore)).toBeNull(); return new Promise(() => {}) })
    await expect(McpEditSessionController.cancel('session', owner.checkoutId!, 2)).resolves.toMatchObject({ status: 'idle', revision: 3, startedRevision: 1, rolledBack: true })
    expect(get(TreeStore.rootNode)).toEqual(baseline)
    expect(get(TreeStore.selectedNodeId)).toBe(2)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(2)
    expect(notice).toHaveBeenCalledWith(expect.objectContaining({ title }))
    expect(EditHistoryController.getEntries().map((entry) => entry.revision)).toEqual([0, 1, 3])
    expect(native.record).toHaveBeenCalledTimes(1) // Only the human edit; agent intermediates and rollback are not recorded.
    await expect(EditHistoryController.redo()).resolves.toBe(false)
    await expect(EditHistoryController.undo()).resolves.toBe(true)
    expect(TreeNode.findNode(get(TreeStore.rootNode), 2)?.disabled ?? false).toBe(false)
    expect(get(TreeStore.revision)).toBe(4)
    expect(() => edit(owner.checkoutId!)).toThrow('Check out')
  })

  it('rejects a foreign ID and stale revision without consuming the checkpoint or touching the draft', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    edit(owner.checkoutId!)
    const root = get(TreeStore.rootNode)
    ElementDialog.openUpdate(2, tag, { createTitle: '', updateTitle: '', fields: [], getInitialValues: () => ({}), create: () => tag, update: () => tag })
    const draft = get(elementDialogStore)
    await expect(McpEditSessionController.cancel('session', 'foreign', 1)).rejects.toMatchObject({ code: 'EDIT_SESSION_MISMATCH' })
    await expect(McpEditSessionController.cancel('session', owner.checkoutId!, 0)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' })
    expect(native.getCheckpoint).not.toHaveBeenCalled()
    expect(get(TreeStore.rootNode)).toBe(root)
    expect(get(elementDialogStore)).toBe(draft)
    expect(McpEditSessionState.status('session', 1)).toMatchObject({ editingLocked: true, rollbackAvailable: true })
  })

  it('refuses editing/checkin while checkpoint capture is pending; failure releases without a success notice', async () => {
    let reject!: (error: Error) => void
    native.createCheckpoint.mockImplementation(() => new Promise((_, failure) => { reject = failure }))
    const pending = McpEditSessionController.checkout('session', 0)
    await vi.waitFor(() => expect(native.createCheckpoint).toHaveBeenCalledOnce())
    const owner = get(McpEditSessionState.store)!
    expect(McpEditSessionState.status('session', 0)).toMatchObject({ operation: 'preparing', rollbackAvailable: false, editingLocked: true })
    expect(() => edit(owner.checkoutId)).toThrow('in progress')
    await expect(McpEditSessionController.checkin('session', owner.checkoutId, 0)).rejects.toMatchObject({ code: 'EDIT_OPERATION_IN_PROGRESS' })
    reject(new Error('snapshot too large'))
    await expect(pending).rejects.toMatchObject({ code: 'CHECKPOINT_FAILED' })
    expect(get(TreeStore.revision)).toBe(0)
    expect(get(McpEditSessionState.store)).toBeNull()
    expect(notice).not.toHaveBeenCalled()
  })

  it('retains the tree and lock after snapshot read failure, then permits a safe retry', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    edit(owner.checkoutId!)
    const root = get(TreeStore.rootNode)
    native.getCheckpoint.mockRejectedValueOnce(new Error('read failed'))
    await expect(McpEditSessionController.cancel('session', owner.checkoutId!, 1)).rejects.toMatchObject({ code: 'ROLLBACK_FAILED' })
    expect(get(TreeStore.rootNode)).toBe(root)
    expect(get(TreeStore.revision)).toBe(1)
    expect(McpEditSessionState.status('session', 1)).toMatchObject({ rollbackAvailable: true, editingLocked: true, operation: null })
    expect(notice).not.toHaveBeenCalled()
    await expect(McpEditSessionController.cancel('session', owner.checkoutId!, 1)).resolves.toMatchObject({ rolledBack: true, revision: 2 })
  })

  it('keeps the checkpoint on history finalization failure and retries using the new revision', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    edit(owner.checkoutId!)
    native.finishCheckpoint.mockRejectedValueOnce(new Error('finish failed'))
    await expect(McpEditSessionController.cancel('session', owner.checkoutId!, 1)).rejects.toMatchObject({ code: 'ROLLBACK_FAILED' })
    expect(get(TreeStore.rootNode)).toEqual(initial())
    expect(get(TreeStore.revision)).toBe(2)
    expect(get(McpEditSessionState.store)?.checkoutId).toBe(owner.checkoutId)
    expect(notice).not.toHaveBeenCalled()
    await expect(McpEditSessionController.cancel('session', owner.checkoutId!, 2)).resolves.toMatchObject({ revision: 3, rolledBack: true })
  })

  it('blocks writes and duplicate finish calls until a rollback read completes', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    let resolve!: (value: string) => void
    const snapshot = checkpoint!.snapshot
    native.getCheckpoint.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const pending = McpEditSessionController.cancel('session', owner.checkoutId!, 0)
    await vi.waitFor(() => expect(native.getCheckpoint).toHaveBeenCalledOnce())
    expect(() => edit(owner.checkoutId!)).toThrow('in progress')
    await expect(McpEditSessionController.cancel('session', owner.checkoutId!, 0)).rejects.toMatchObject({ code: 'EDIT_OPERATION_IN_PROGRESS' })
    await expect(McpEditSessionController.checkin('session', owner.checkoutId!, 0)).rejects.toMatchObject({ code: 'EDIT_OPERATION_IN_PROGRESS' })
    resolve(snapshot)
    await expect(pending).resolves.toMatchObject({ revision: 1, rolledBack: true })
  })

  it('does not restore an old checkpoint into a replaced project after native I/O', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    let resolve!: (value: string) => void
    const snapshot = checkpoint!.snapshot
    native.getCheckpoint.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const pending = McpEditSessionController.cancel('session', owner.checkoutId!, 0)
    await vi.waitFor(() => expect(native.getCheckpoint).toHaveBeenCalledOnce())
    McpEditSessionState.reset()
    TreeStore.replaceRoot({ ...initial(), id: 10 })
    const current = McpEditSessionState.checkout('new-session', 0)
    const root = get(TreeStore.rootNode)
    resolve(snapshot)
    await expect(pending).rejects.toMatchObject({ code: 'ROLLBACK_FAILED' })
    expect(get(TreeStore.rootNode)).toBe(root)
    expect(get(TreeStore.revision)).toBe(0)
    expect(get(McpEditSessionState.store)).toEqual(current)
    expect(notice).not.toHaveBeenCalled()
    // Drain the serialized abandoned-checkpoint cleanup before the next test.
    await EditHistoryController.undo()
  })

  it('retains owner and draft when checkin checkpoint disposal fails', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    ElementDialog.openUpdate(2, tag, { createTitle: '', updateTitle: '', fields: [], getInitialValues: () => ({}), create: () => tag, update: () => tag })
    const draft = get(elementDialogStore)
    native.finishCheckpoint.mockRejectedValueOnce(new Error('dispose failed'))
    await expect(McpEditSessionController.checkin('session', owner.checkoutId!, 0)).rejects.toMatchObject({ code: 'CHECKPOINT_FAILED' })
    expect(get(elementDialogStore)).toBe(draft)
    expect(get(McpEditSessionState.store)?.checkoutId).toBe(owner.checkoutId)
    expect(McpEditSessionState.status('session', 0)).toMatchObject({ rollbackAvailable: true, operation: null })
    expect(notice).not.toHaveBeenCalled()
    await McpEditSessionController.checkin('session', owner.checkoutId!, 0)
    expect(get(elementDialogStore)).toBeNull()
  })

  it('groups many live edits into one Undo/Redo with interaction state and preserves older human history', async () => {
    TreeStore.toggleDisabled(2)
    TreeStore.selectedNodeId.set(2)
    TreeViewportController.setViewRootNodeId(get(TreeStore.rootNode), 2)
    const baseline = structuredClone(get(TreeStore.rootNode))
    const owner = await McpEditSessionController.checkout('session', 1)
    edit(owner.checkoutId); edit(owner.checkoutId); edit(owner.checkoutId)
    expect(get(TreeStore.revision)).toBe(4)
    expect(EditHistoryController.getEntries().map((entry) => entry.revision)).toEqual([0, 1, 4])
    TreeStore.selectedNodeId.set(1)
    TreeViewportController.setViewRootNodeId(get(TreeStore.rootNode), null)
    const final = structuredClone(get(TreeStore.rootNode))
    await McpEditSessionController.checkin('session', owner.checkoutId, 4)
    expect(get(TreeStore.revision)).toBe(4)
    expect(native.record).toHaveBeenCalledOnce()
    expect(EditHistoryController.getEntries().at(-1)).toMatchObject({ source: 'mcp', label: 'Agent work', previousRevision: 1, revision: 4, snapshot: { selectedNodeId: 1, viewRootNodeId: null } })
    await expect(EditHistoryController.undo()).resolves.toBe(true)
    expect(get(TreeStore.rootNode)).toEqual(baseline)
    expect(get(TreeStore.selectedNodeId)).toBe(2)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(2)
    expect(get(TreeStore.revision)).toBe(5)
    await expect(EditHistoryController.redo()).resolves.toBe(true)
    expect(get(TreeStore.rootNode)).toEqual(final)
    expect(get(TreeStore.selectedNodeId)).toBe(1)
    expect(get(TreeViewportController.state).viewRootNodeId).toBeNull()
    expect(get(TreeStore.revision)).toBe(6)
    await EditHistoryController.undo()
    await expect(EditHistoryController.undo()).resolves.toBe(true)
    expect(get(TreeStore.rootNode)).toEqual(initial())
    await expect(EditHistoryController.undo()).resolves.toBe(false)
  })

  it('keeps pre-existing Redo and adds no history for read/navigation-only work', async () => {
    TreeStore.toggleDisabled(2)
    await EditHistoryController.undo()
    const owner = await McpEditSessionController.checkout('session', 2)
    TreeStore.transaction({ source: 'mcp', checkoutId: owner.checkoutId, label: 'No change', expectedRevision: 2 }, () => false)
    TreeStore.selectedNodeId.set(2)
    TreeViewportController.setViewRootNodeId(get(TreeStore.rootNode), 2)
    await McpEditSessionController.checkin('session', owner.checkoutId, 2)
    expect(get(TreeStore.revision)).toBe(2)
    expect(native.finishCheckpoint).toHaveBeenLastCalledWith(owner.checkoutId, false, false)
    await expect(EditHistoryController.undo()).resolves.toBe(false)
    await expect(EditHistoryController.redo()).resolves.toBe(true)
    expect(TreeNode.findNode(get(TreeStore.rootNode), 2)?.disabled).toBe(true)
  })

  it.each(['keep', 'rollback'] as const)('recovers an interrupted checkout via the %s UI choice', async (mode) => {
    const owner = await McpEditSessionController.checkout('old-session', 0)
    edit(owner.checkoutId)
    McpSessionState.reset()
    expect(McpEditSessionState.status('new-session', 1)).toMatchObject({ recoveryRequired: true, editingLocked: true, rollbackAvailable: true, sessionId: 'old-session', publishedSessionId: 'new-session' })
    expect(() => edit(owner.checkoutId)).toThrow('Resolve the previous checkout')
    await expect(McpEditSessionController.checkin('old-session', owner.checkoutId, 1)).rejects.toMatchObject({ code: 'EDIT_SESSION_RECOVERY_REQUIRED' })
    confirmation.mockImplementation(async ({ choices }) => {
      expect(choices.map((choice: any) => choice.label)).toEqual(['編集内容を維持して終了', '開始時へ戻して終了'])
      await choices[mode === 'keep' ? 0 : 1].callback?.()
      return true
    })
    await McpEditSessionController.release()
    expect(get(McpEditSessionState.store)).toBeNull()
    if (mode === 'keep') {
      expect(get(TreeStore.revision)).toBe(1)
      expect(TreeNode.findNode(get(TreeStore.rootNode), 2)?.disabled).toBe(true)
      await expect(EditHistoryController.undo()).resolves.toBe(true)
    } else {
      expect(get(TreeStore.revision)).toBe(2)
      expect(get(TreeStore.rootNode)).toEqual(initial())
      await expect(EditHistoryController.undo()).resolves.toBe(false)
      await expect(EditHistoryController.redo()).resolves.toBe(false)
    }
  })

  it('never leaves an aborted intermediate snapshot in the log if keep is chosen after failed rollback finalization', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    edit(owner.checkoutId)
    native.finishCheckpoint.mockRejectedValueOnce(new Error('finish failed'))
    await expect(McpEditSessionController.cancel('session', owner.checkoutId, 1)).rejects.toMatchObject({ code: 'ROLLBACK_FAILED' })
    await McpEditSessionController.checkin('session', owner.checkoutId, 2)
    expect(EditHistoryController.getEntries().map((entry) => entry.revision)).toEqual([0, 2])
    expect(EditHistoryController.getEntries().every((entry) => !(TreeNode.findNode(entry.snapshot.rootNode, 2)?.disabled ?? false))).toBe(true)
  })

  it('does not silently lose Undo when the native grouping command is unavailable', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    edit(owner.checkoutId)
    native.commitCheckpoint.mockRejectedValueOnce(new Error('Command edit_history_commit_checkpoint not found'))
    await expect(McpEditSessionController.checkin('session', owner.checkoutId, 1)).rejects.toMatchObject({ code: 'CHECKPOINT_FAILED' })
    expect(native.finishCheckpoint).not.toHaveBeenCalled()
    expect(get(McpEditSessionState.store)?.checkoutId).toBe(owner.checkoutId)
    expect(checkpoint).not.toBeNull()
    await expect(McpEditSessionController.cancel('session', owner.checkoutId, 1)).resolves.toMatchObject({ rolledBack: true })
  })

  it('checkin keeps live changes and removes only the checkpoint', async () => {
    const owner = await McpEditSessionController.checkout('session', 0)
    edit(owner.checkoutId!)
    const root = get(TreeStore.rootNode)
    await McpEditSessionController.checkin('session', owner.checkoutId!, 1)
    expect(native.finishCheckpoint).toHaveBeenLastCalledWith(owner.checkoutId, false, true)
    expect(checkpoint).toBeNull()
    expect(get(TreeStore.rootNode)).toBe(root)
    expect(get(TreeStore.revision)).toBe(1)
    await expect(EditHistoryController.undo()).resolves.toBe(true)
  })
})
