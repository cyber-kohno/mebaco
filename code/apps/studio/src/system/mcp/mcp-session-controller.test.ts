import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectSession from '@system/project/project-session-store'
import type TreeNode from '@system/model/tree/tree-node'
import McpSessionController from './mcp-session-controller'
import McpSessionState from './mcp-session-state'
import McpEditSessionState from './mcp-edit-session-state'
import { get } from 'svelte/store'
import { clearLanguagePreview, setLanguagePreview, translateFor } from '@system/application/localization'

const tauriMcp = vi.hoisted(() => ({
  startSession: vi.fn(),
  stopSession: vi.fn(),
  updateSessionDirty: vi.fn(),
  probeSession: vi.fn(),
}))

vi.mock('@system/infra/tauri/mcp', () => ({ default: tauriMcp }))

const rootNode = {
  id: 1,
  element: { kind: 'project' },
  isOpen: true,
  children: [],
} as TreeNode.Node

describe('McpSessionController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearLanguagePreview()
    McpEditSessionState.reset()
    ProjectSession.clear()
    McpSessionState.reset()
    tauriMcp.startSession.mockResolvedValue({
      sessionId: 'session-1',
      endpoint: 'http://127.0.0.1:1234',
      pid: 123,
    })
    tauriMcp.stopSession.mockResolvedValue(undefined)
    tauriMcp.updateSessionDirty.mockResolvedValue(undefined)
    tauriMcp.probeSession.mockResolvedValue({ ok: true })
  })

  it('rejects start while no project is open', async () => {
    const result = await McpSessionController.start()

    expect(result.outcome).toBe('rejected')
    expect(McpSessionController.getStatus()).toBe('stopped')
  })

  it('starts once and treats a second start as unchanged', async () => {
    ProjectSession.startNew(rootNode)

    await expect(McpSessionController.start()).resolves.toMatchObject({
      outcome: 'changed',
      status: 'available',
      message: [
        'MCP development session is available.',
        'Session ID: session-1',
        'Endpoint: http://127.0.0.1:1234',
        'PID: 123',
      ].join('\n'),
    })
    expect(McpSessionController.getDetails()).toEqual({
      sessionId: 'session-1',
      endpoint: 'http://127.0.0.1:1234',
      pid: 123,
    })
    await expect(McpSessionController.start()).resolves.toMatchObject({
      outcome: 'unchanged',
      status: 'available',
    })
  })

  it('stops once and treats a second stop as unchanged', async () => {
    ProjectSession.startNew(rootNode)
    await McpSessionController.start()

    await expect(McpSessionController.stop()).resolves.toMatchObject({
      outcome: 'changed',
      status: 'stopped',
    })
    expect(McpSessionController.getDetails()).toBeNull()
    await expect(McpSessionController.stop()).resolves.toMatchObject({
      outcome: 'unchanged',
      status: 'stopped',
    })
  })

  it('synchronizes dirty state while a session is available', async () => {
    ProjectSession.startNew(rootNode)
    await McpSessionController.start()

    await McpSessionController.syncDirty(true)

    expect(tauriMcp.updateSessionDirty).toHaveBeenCalledWith(true)
  })

  it.each(['en', 'ja'] as const)('rejects stopping during checkout without changing publication or checkout (%s)', async (language) => {
    ProjectSession.startNew(rootNode)
    await McpSessionController.start()
    const checkout = McpEditSessionState.checkout('session-1', 0)
    const details = McpSessionController.getDetails()
    setLanguagePreview(language)
    expect(await McpSessionController.stop()).toEqual({
      outcome: 'rejected', status: 'available', message: translateFor(language, 'mcp.edit.stopBlocked'),
    })
    expect(tauriMcp.stopSession).not.toHaveBeenCalled()
    expect(McpSessionController.getStatus()).toBe('available')
    expect(McpSessionController.getDetails()).toEqual(details)
    expect(get(McpEditSessionState.store)).toEqual(checkout)
    McpEditSessionState.checkin('session-1', checkout.checkoutId, 0)
    expect((await McpSessionController.stop()).outcome).toBe('changed')
    expect(tauriMcp.stopSession).toHaveBeenCalledOnce()
    expect(get(McpEditSessionState.store)).toBeNull()
    clearLanguagePreview()
  })

  it('allows stop after manual release', async () => {
    ProjectSession.startNew(rootNode)
    await McpSessionController.start()
    McpEditSessionState.checkout('session-1', 0)
    McpEditSessionState.reset()
    expect((await McpSessionController.stop()).outcome).toBe('changed')
    expect(tauriMcp.stopSession).toHaveBeenCalledOnce()
  })

  it('does not silently clear a checkout even if publication status is stopped', async () => {
    const checkout = McpEditSessionState.checkout('session-1', 0)
    expect((await McpSessionController.stop()).outcome).toBe('rejected')
    expect(get(McpEditSessionState.store)).toEqual(checkout)
    expect(tauriMcp.stopSession).not.toHaveBeenCalled()
  })

  it('refuses native restart while recovery is required', async () => {
    ProjectSession.startNew(rootNode)
    McpEditSessionState.checkout('old-session', 0)
    McpSessionState.reset()
    expect(get(McpEditSessionState.store)).toMatchObject({ recoveryRequired: true })
    expect((await McpSessionController.start()).outcome).toBe('rejected')
    expect(tauriMcp.startSession).not.toHaveBeenCalled()
  })

  it('moves to error when the native bridge cannot start', async () => {
    ProjectSession.startNew(rootNode)
    tauriMcp.startSession.mockRejectedValue('listener failed')

    await expect(McpSessionController.start()).resolves.toMatchObject({
      outcome: 'rejected',
      status: 'error',
    })
    expect(McpSessionController.getStatus()).toBe('error')
  })

  it('stops the native session when the WebView probe fails', async () => {
    ProjectSession.startNew(rootNode)
    tauriMcp.probeSession.mockRejectedValue('bridge timeout')

    await expect(McpSessionController.start()).resolves.toMatchObject({
      outcome: 'rejected',
      status: 'error',
    })
    expect(tauriMcp.stopSession).toHaveBeenCalledOnce()
  })
})
