import { get, readonly, writable } from 'svelte/store'
import { translate } from '@system/application/localization'

namespace McpEditSessionState {
  export type Checkout = {
    status: 'checked_out'
    checkoutId: string
    sessionId: string
    startedRevision: number
    startedAtEpochMs: number
    recoveryRequired?: boolean
  }

  export class Error extends globalThis.Error {
    constructor(readonly code: string, message: string) { super(message) }
  }

  const active = writable<Checkout | null>(null)
  let pendingUserOperations = 0
  let operation: { checkoutId: string; kind: 'preparing' | 'checking_in' | 'rolling_back' } | null = null
  let checkpointId: string | null = null
  export const store = readonly(active)

  export const status = (sessionId: string, revision: number) => ({
    ...(get(active) ?? { status: 'idle' as const, sessionId }),
    revision,
    editingLocked: get(active) != null,
    rollbackAvailable: get(active) != null && checkpointId === get(active)?.checkoutId,
    operation: operation?.kind ?? null,
    recoveryRequired: get(active)?.recoveryRequired ?? false,
    publishedSessionId: sessionId,
  })

  export const checkout = (sessionId: string, revision: number): Checkout => {
    if (get(active) != null) throw new Error('EDIT_SESSION_ACTIVE', 'An edit session is already checked out. Check in or release it in Studio first.')
    if (pendingUserOperations > 0) throw new Error('EDIT_OPERATION_IN_PROGRESS', 'A user history operation is in progress. Retry checkout after it finishes.')
    const checkout: Checkout = {
      status: 'checked_out', checkoutId: crypto.randomUUID(), sessionId,
      startedRevision: revision, startedAtEpochMs: Date.now(),
    }
    active.set(checkout)
    return checkout
  }

  export const assertUserEditAllowed = (): void => {
    if (get(active) != null) throw new Error('EDIT_SESSION_ACTIVE', translate('mcp.edit.userEditBlocked'))
  }

  export const assertCheckout = (checkoutId: unknown, sessionId?: string, allowBusy = false, allowRecovery = false): Checkout => {
    if (typeof checkoutId !== 'string' || checkoutId.trim() === '') {
      throw new Error('INVALID_PARAMS', 'A non-empty checkoutId is required for project updates.')
    }
    const checkout = get(active)
    if (checkout == null) throw new Error('EDIT_SESSION_NOT_ACTIVE', 'Check out the project before updating it.')
    if (checkout.checkoutId !== checkoutId || (sessionId != null && checkout.sessionId !== sessionId)) {
      throw new Error('EDIT_SESSION_MISMATCH', 'checkoutId does not belong to the active edit session.')
    }
    if (!allowBusy && operation != null) throw new Error('EDIT_OPERATION_IN_PROGRESS', 'An edit session operation is in progress. Read status and retry after it finishes.')
    if (!allowRecovery && checkout.recoveryRequired) throw new Error('EDIT_SESSION_RECOVERY_REQUIRED', 'The published session changed or disappeared. Resolve the previous checkout in Studio before editing again.')
    return checkout
  }

  export const beginOperation = (checkoutId: string, sessionId: string, kind: NonNullable<typeof operation>['kind'], allowRecovery = false): (() => void) => {
    assertCheckout(checkoutId, sessionId, false, allowRecovery)
    const pending = { checkoutId, kind }
    operation = pending
    return () => { if (operation === pending) operation = null }
  }

  export const markCheckpointReady = (checkoutId: string, sessionId: string): void => {
    assertCheckout(checkoutId, sessionId, true, true)
    checkpointId = checkoutId
  }

  // Reserve before touching Rust history so checkout cannot race an in-flight undo/redo.
  export const beginUserOperation = (): (() => void) => {
    assertUserEditAllowed()
    pendingUserOperations += 1
    let ended = false
    return () => { if (!ended) { ended = true; pendingUserOperations -= 1 } }
  }

  export const checkin = (sessionId: string, checkoutId: string, revision: number) => {
    const checkout = get(active)
    if (checkout == null) throw new Error('EDIT_SESSION_NOT_ACTIVE', 'No edit session is checked out.')
    if (checkout.sessionId !== sessionId || checkout.checkoutId !== checkoutId) {
      throw new Error('EDIT_SESSION_MISMATCH', 'checkoutId does not belong to the active edit session.')
    }
    if (operation != null) throw new Error('EDIT_OPERATION_IN_PROGRESS', 'An edit session operation is in progress.')
    active.set(null)
    checkpointId = null
    return {
      status: 'idle' as const, sessionId, checkoutId,
      startedRevision: checkout.startedRevision, revision,
      revisionChanged: revision !== checkout.startedRevision,
    }
  }

  export const reset = (): void => { active.set(null); operation = null; checkpointId = null }

  export const requireRecovery = (): void => {
    const checkout = get(active)
    if (checkout != null && !checkout.recoveryRequired) active.set({ ...checkout, recoveryRequired: true })
  }
}

export default McpEditSessionState
