import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectSession from '@system/project/project-session-store'
import type TreeNode from '@system/model/tree/tree-node'
import McpSessionController from './mcp-session-controller'
import McpSessionState from './mcp-session-state'

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
