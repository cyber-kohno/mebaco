import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import McpEditSessionState from '@system/mcp/mcp-edit-session-state'
import McpUserEditGuard from '@system/mcp/mcp-user-edit-guard'
import ActionMenu from './action-menu-controller'
import { actionMenuStore } from './action-menu-store'

vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: { show: vi.fn() } }))

describe('Action menu rejected edits', () => {
  beforeEach(() => { McpEditSessionState.reset(); ActionMenu.close() })
  afterEach(() => { McpEditSessionState.reset(); ActionMenu.close() })

  it('handles a synchronous locked edit without an uncaught UI event error', () => {
    McpEditSessionState.checkout('session', 0)
    const commit = vi.fn()
    ActionMenu.openAt([{ type: 'action', label: 'Delete', callback: () => { McpUserEditGuard.assertAllowed(); commit() } }], 0, 0)
    expect(() => ActionMenu.enter()).not.toThrow()
    expect(commit).not.toHaveBeenCalled()
    expect(get(actionMenuStore)).toBeNull()
  })

  it('does not swallow unrelated synchronous failures', () => {
    ActionMenu.openAt([{ type: 'action', label: 'Unexpected failure', callback: () => { throw new Error('unexpected') } }], 0, 0)
    expect(() => ActionMenu.enter()).toThrow('unexpected')
  })
})
