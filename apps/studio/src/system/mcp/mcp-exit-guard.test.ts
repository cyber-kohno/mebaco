import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  stop: vi.fn(),
  show: vi.fn(),
}))

vi.mock('./mcp-session-controller', () => ({
  default: { stop: mocks.stop },
}))
vi.mock('@system/ui/feedback/toast/toast-controller', () => ({
  default: { show: mocks.show },
}))

import McpExitGuard from './mcp-exit-guard'

describe('McpExitGuard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows exit when MCP is already stopped', async () => {
    mocks.stop.mockResolvedValue({ outcome: 'unchanged' })

    await expect(McpExitGuard.stopBeforeExit()).resolves.toBe(true)
    expect(mocks.show).not.toHaveBeenCalled()
  })

  it('blocks exit and reports a stop failure', async () => {
    mocks.stop.mockResolvedValue({
      outcome: 'rejected',
      message: 'Could not stop MCP.',
    })

    await expect(McpExitGuard.stopBeforeExit()).resolves.toBe(false)
    expect(mocks.show).toHaveBeenCalledWith('Could not stop MCP.', {
      tone: 'danger',
      durationMs: 5000,
    })
  })
})
