import { describe, expect, it } from 'vitest'
import {
  getMcpStatusPresentation,
  shortenMcpSessionId,
} from './mcp-status-presentation'

describe('MCP status presentation', () => {
  it.each([
    ['starting', 'mcp.status.starting', 'pending'],
    ['available', 'mcp.status.available', 'available'],
    ['connected', 'mcp.status.connected', 'connected'],
    ['stopping', 'mcp.status.stopping', 'pending'],
    ['error', 'mcp.status.error', 'error'],
  ] as const)('maps %s to a localized presentation', (status, labelKey, tone) => {
    expect(getMcpStatusPresentation(status)).toEqual({ labelKey, tone })
  })

  it.each(['available', 'connected'] as const)('uses one editing label and tone while %s is checked out', (status) => {
    expect(getMcpStatusPresentation(status, true)).toEqual({ labelKey: 'mcp.edit.active', tone: 'editing' })
    expect(getMcpStatusPresentation(status, false)).toEqual(getMcpStatusPresentation(status))
  })

  it.each(['starting', 'stopping', 'error'] as const)('does not hide the %s transport state behind editing', (status) => {
    expect(getMcpStatusPresentation(status, true)).toEqual(getMcpStatusPresentation(status))
  })

  it('uses a stable eight-character session ID in the compact badge', () => {
    expect(shortenMcpSessionId('7b7b0e3e-f9f1-43b6-bd15-e8de93e43a21')).toBe('7b7b0e3e')
  })
})
