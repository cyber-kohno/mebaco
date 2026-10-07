import { get } from 'svelte/store'
import { tick } from 'svelte'
import { translate } from '@system/application/localization'
import ConfirmDialogController from '@system/ui/feedback/confirm/confirm-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import McpEditSessionState from './mcp-edit-session-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import EditHistoryController from '@system/workspace/history/edit-history-controller'
import ToastController from '@system/ui/feedback/toast/toast-controller'

namespace McpEditSessionController {
  const notices = {
    completed: { title: 'mcp.edit.completed.title', message: 'mcp.edit.completed.message' },
    released: { title: 'mcp.edit.released.title', message: 'mcp.edit.released.message' },
    cancelled: { title: 'mcp.edit.cancelled.title', message: 'mcp.edit.cancelled.message' },
  } as const

  const assertRevision = (expectedRevision: number): void => {
    const actualRevision = get(TreeStore.revision)
    if (expectedRevision !== actualRevision) throw new McpEditSessionState.Error('REVISION_CONFLICT', `Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`)
  }

  const notify = async (notice: keyof typeof notices): Promise<void> => {
    ElementDialog.close()
    await tick()
    void ConfirmDialogController.openNotice({
      title: translate(notices[notice].title), message: translate(notices[notice].message),
    })
  }

  export const checkout = async (sessionId: string, revision: number) => {
    assertRevision(revision)
    const owner = McpEditSessionState.checkout(sessionId, revision)
    const end = McpEditSessionState.beginOperation(owner.checkoutId, sessionId, 'preparing')
    try {
      await EditHistoryController.createCheckpoint(owner.checkoutId)
      McpEditSessionState.markCheckpointReady(owner.checkoutId, sessionId)
      end()
      return { ...owner, revision: get(TreeStore.revision), editingLocked: true, rollbackAvailable: true, operation: null, recoveryRequired: get(McpEditSessionState.store)?.recoveryRequired ?? false }
    } catch (error) {
      end()
      if (get(McpEditSessionState.store)?.checkoutId === owner.checkoutId) McpEditSessionState.checkin(sessionId, owner.checkoutId, revision)
      throw new McpEditSessionState.Error('CHECKPOINT_FAILED', `Cannot safely start agent editing: ${String(error)}`)
    } finally { end() }
  }

  export const checkin = async (
    sessionId: string,
    checkoutId: string,
    revision: number,
    notice: keyof typeof notices = 'completed',
    allowRecovery = false,
  ) => {
    McpEditSessionState.assertCheckout(checkoutId, sessionId, false, allowRecovery)
    assertRevision(revision)
    if (McpEditSessionState.status(sessionId, revision).rollbackAvailable) {
      const end = McpEditSessionState.beginOperation(checkoutId, sessionId, 'checking_in', allowRecovery)
      try { await EditHistoryController.discardCheckpoint(checkoutId) }
      catch (error) { throw new McpEditSessionState.Error('CHECKPOINT_FAILED', `Cannot finish agent editing: ${String(error)}`) }
      finally { end() }
    }
    const result = McpEditSessionState.checkin(sessionId, checkoutId, revision)
    await notify(notice)
    return result
  }

  export const cancel = async (sessionId: string, checkoutId: string, revision: number, allowRecovery = false) => {
    McpEditSessionState.assertCheckout(checkoutId, sessionId, false, allowRecovery)
    assertRevision(revision)
    if (!McpEditSessionState.status(sessionId, revision).rollbackAvailable) throw new McpEditSessionState.Error('CHECKPOINT_UNAVAILABLE', 'No rollback checkpoint is available for this edit session.')
    const end = McpEditSessionState.beginOperation(checkoutId, sessionId, 'rolling_back', allowRecovery)
    try { await EditHistoryController.rollbackCheckpoint(checkoutId, revision) }
    catch (error) { throw new McpEditSessionState.Error('ROLLBACK_FAILED', `Rollback did not finish; the edit lock is retained. Read status and the latest revision before retrying: ${String(error)}`) }
    finally { end() }
    const result = McpEditSessionState.checkin(sessionId, checkoutId, get(TreeStore.revision))
    await notify('cancelled')
    return { ...result, rolledBack: true }
  }

  export const release = async (): Promise<void> => {
    const checkout = get(McpEditSessionState.store)
    if (checkout == null) return
    if (McpEditSessionState.status(checkout.sessionId, get(TreeStore.revision)).operation != null) return
    const decision: { mode: 'keep' | 'rollback' } = { mode: 'keep' }
    const rollbackAvailable = McpEditSessionState.status(checkout.sessionId, get(TreeStore.revision)).rollbackAvailable
    const accepted = await ConfirmDialogController.open({
      tone: 'warning', title: translate('mcp.edit.release.title'),
      message: translate('mcp.edit.release.message'),
      choices: [
        { label: translate('mcp.edit.keep.action'), role: 'proceed' },
        ...(rollbackAvailable ? [{ label: translate('mcp.edit.rollback.action'), role: 'proceed' as const, callback: () => { decision.mode = 'rollback' } }] : []),
      ],
    })
    // Never release a new checkout that began while the confirmation was open.
    if (!accepted || get(McpEditSessionState.store)?.checkoutId !== checkout.checkoutId) return
    if (McpEditSessionState.status(checkout.sessionId, get(TreeStore.revision)).operation != null) return
    try {
      if (decision.mode === 'rollback') await cancel(checkout.sessionId, checkout.checkoutId, get(TreeStore.revision), true)
      else await checkin(checkout.sessionId, checkout.checkoutId, get(TreeStore.revision), 'released', true)
    }
    catch (error) {
      console.error('Failed to release the agent edit session.', error)
      ToastController.show(translate('mcp.edit.releaseFailed'), { tone: 'danger', durationMs: 5000 })
    }
  }
}

export default McpEditSessionController
