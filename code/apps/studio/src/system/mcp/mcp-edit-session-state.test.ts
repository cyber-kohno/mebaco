import { beforeEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import McpEditSessionState from './mcp-edit-session-state'

describe('MCP edit session ownership', () => {
  beforeEach(() => McpEditSessionState.reset())

  it('rejects a second checkout and a foreign checkin without releasing the owner', () => {
    const checkout = McpEditSessionState.checkout('session', 10)
    expect(() => McpEditSessionState.checkout('session', 10)).toThrow('already checked out')
    expect(() => McpEditSessionState.checkin('session', 'other', 12)).toThrow('does not belong')
    expect(() => McpEditSessionState.checkin('other-session', checkout.checkoutId, 12)).toThrow('does not belong')
    expect(get(McpEditSessionState.store)).toEqual(checkout)
    expect(McpEditSessionState.checkin('session', checkout.checkoutId, 12)).toMatchObject({
      status: 'idle', startedRevision: 10, revision: 12, revisionChanged: true,
    })
    expect(get(McpEditSessionState.store)).toBeNull()
  })

  it('invalidates old checkout IDs after release and re-checkout', () => {
    const previous = McpEditSessionState.checkout('session', 0)
    McpEditSessionState.reset()
    const current = McpEditSessionState.checkout('session', 0)
    expect(current.checkoutId).not.toBe(previous.checkoutId)
    expect(() => McpEditSessionState.checkin('session', previous.checkoutId, 0)).toThrow('does not belong')
    expect(McpEditSessionState.status('session', 0)).toMatchObject({
      checkoutId: current.checkoutId, editingLocked: true, rollbackAvailable: false,
    })
  })

  it('validates checkout ownership for updates and locks user commits', () => {
    expect(() => McpEditSessionState.assertCheckout(null)).toThrow('non-empty')
    expect(() => McpEditSessionState.assertCheckout('old')).toThrow('Check out')
    const checkout = McpEditSessionState.checkout('session', 0)
    expect(McpEditSessionState.assertCheckout(checkout.checkoutId, 'session')).toEqual(checkout)
    expect(() => McpEditSessionState.assertCheckout('foreign')).toThrow('does not belong')
    expect(() => McpEditSessionState.assertCheckout(checkout.checkoutId, 'foreign')).toThrow('does not belong')
    expect(() => McpEditSessionState.assertUserEditAllowed()).toThrowError(McpEditSessionState.Error)
    McpEditSessionState.checkin('session', checkout.checkoutId, 0)
    expect(() => McpEditSessionState.assertUserEditAllowed()).not.toThrow()
  })

  it('reserves in-flight user history operations against checkout', () => {
    const end = McpEditSessionState.beginUserOperation()
    expect(() => McpEditSessionState.checkout('session', 0)).toThrow('in progress')
    end()
    end()
    const checkout = McpEditSessionState.checkout('session', 0)
    expect(() => McpEditSessionState.beginUserOperation()).toThrowError(McpEditSessionState.Error)
    McpEditSessionState.checkin('session', checkout.checkoutId, 0)
  })

  it('blocks writes and finish calls while checkpoint I/O is pending', () => {
    const checkout = McpEditSessionState.checkout('session', 5)
    const end = McpEditSessionState.beginOperation(checkout.checkoutId, 'session', 'preparing')
    expect(McpEditSessionState.status('session', 5)).toMatchObject({ operation: 'preparing', rollbackAvailable: false })
    expect(() => McpEditSessionState.assertCheckout(checkout.checkoutId)).toThrow('in progress')
    expect(() => McpEditSessionState.checkin('session', checkout.checkoutId, 5)).toThrow('in progress')
    McpEditSessionState.markCheckpointReady(checkout.checkoutId, 'session')
    end()
    expect(McpEditSessionState.status('session', 5)).toMatchObject({ operation: null, rollbackAvailable: true })
    McpEditSessionState.checkin('session', checkout.checkoutId, 5)
    expect(McpEditSessionState.status('session', 5).rollbackAvailable).toBe(false)
  })

  it('keeps ownership/checkpoint through interruption and rejects ordinary agent writes', () => {
    const owner = McpEditSessionState.checkout('old-session', 0)
    McpEditSessionState.markCheckpointReady(owner.checkoutId, 'old-session')
    McpEditSessionState.requireRecovery()
    McpEditSessionState.requireRecovery()
    expect(McpEditSessionState.status('new-session', 1)).toMatchObject({ checkoutId: owner.checkoutId, sessionId: 'old-session', publishedSessionId: 'new-session', recoveryRequired: true, rollbackAvailable: true, editingLocked: true })
    expect(() => McpEditSessionState.assertCheckout(owner.checkoutId)).toThrow('Resolve the previous checkout')
    expect(() => McpEditSessionState.assertUserEditAllowed()).toThrowError(McpEditSessionState.Error)
    expect(() => McpEditSessionState.checkout('new-session', 1)).toThrow('already checked out')
    const end = McpEditSessionState.beginOperation(owner.checkoutId, 'old-session', 'rolling_back', true)
    expect(() => McpEditSessionState.beginOperation(owner.checkoutId, 'old-session', 'checking_in', true)).toThrow('in progress')
    end()
  })

  it('finishes an unchanged session and rejects repeat checkin', () => {
    const checkout = McpEditSessionState.checkout('session', 5)
    expect(McpEditSessionState.checkin('session', checkout.checkoutId, 5).revisionChanged).toBe(false)
    expect(() => McpEditSessionState.checkin('session', checkout.checkoutId, 5)).toThrow('No edit session')
  })
})
