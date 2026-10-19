import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommandContext } from '../command-types'

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  getDetails: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('@system/mcp/mcp-session-controller', () => ({ default: mocks }))

import createMcpCatalog from './mcp-catalog'

const createContext = (): CommandContext => ({
  appendOutput: vi.fn(),
} as unknown as CommandContext)

describe('mcp catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getStatus.mockReturnValue('stopped')
    mocks.getDetails.mockReturnValue(null)
  })

  it('reports the active session identity without exposing its token', async () => {
    mocks.getStatus.mockReturnValue('available')
    mocks.getDetails.mockReturnValue({
      sessionId: 'session-1',
      endpoint: 'http://127.0.0.1:1234',
      pid: 123,
    })
    const context = createContext()

    await createMcpCatalog().execute(context, ['status'])

    expect(context.appendOutput).toHaveBeenCalledWith(
      'normal',
      'MCP development session: available.\nSession ID: session-1\nEndpoint: http://127.0.0.1:1234\nPID: 123',
    )
  })

  it('reports status', async () => {
    const context = createContext()
    await createMcpCatalog().execute(context, ['status'])

    expect(context.appendOutput).toHaveBeenCalledWith(
      'normal',
      'MCP development session: stopped.',
    )
  })

  it('starts and stops through the session controller', async () => {
    mocks.start.mockResolvedValue({
      outcome: 'changed',
      status: 'available',
      message: 'MCP development session is available.',
    })
    mocks.stop.mockResolvedValue({
      outcome: 'changed',
      status: 'stopped',
      message: 'MCP development session stopped.',
    })
    const context = createContext()
    const command = createMcpCatalog()

    await command.execute(context, ['start'])
    await command.execute(context, ['stop'])

    expect(mocks.start).toHaveBeenCalledOnce()
    expect(mocks.stop).toHaveBeenCalledOnce()
    expect(context.appendOutput).toHaveBeenNthCalledWith(
      1,
      'success',
      'MCP development session is available.',
    )
    expect(context.appendOutput).toHaveBeenNthCalledWith(
      2,
      'success',
      'MCP development session stopped.',
    )
  })

  it('shows usage for unsupported arguments', async () => {
    const context = createContext()
    await createMcpCatalog().execute(context, [])

    expect(context.appendOutput).toHaveBeenCalledWith(
      'warning',
      'Usage: mcp <start|stop|status>',
    )
  })
})
