import type { MessageKey } from '@system/application/localization'
import type { McpSessionStatus } from './mcp-types'

export type McpStatusPresentation = {
  labelKey: MessageKey
  tone: 'pending' | 'available' | 'connected' | 'error'
}

const presentations: Readonly<Record<Exclude<McpSessionStatus, 'stopped'>, McpStatusPresentation>> = {
  starting: { labelKey: 'mcp.status.starting', tone: 'pending' },
  available: { labelKey: 'mcp.status.available', tone: 'available' },
  connected: { labelKey: 'mcp.status.connected', tone: 'connected' },
  stopping: { labelKey: 'mcp.status.stopping', tone: 'pending' },
  error: { labelKey: 'mcp.status.error', tone: 'error' },
}

export const getMcpStatusPresentation = (
  status: Exclude<McpSessionStatus, 'stopped'>,
): McpStatusPresentation => presentations[status]

export const shortenMcpSessionId = (sessionId: string): string => sessionId.slice(0, 8)
