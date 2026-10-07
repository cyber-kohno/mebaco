import type { MessageKey } from '@system/application/localization'
import type { McpSessionStatus } from './mcp-types'

export type McpStatusPresentation = {
  labelKey: MessageKey
  tone: 'pending' | 'available' | 'connected' | 'error' | 'editing'
}

const presentations: Readonly<Record<Exclude<McpSessionStatus, 'stopped'>, McpStatusPresentation>> = {
  starting: { labelKey: 'mcp.status.starting', tone: 'pending' },
  available: { labelKey: 'mcp.status.available', tone: 'available' },
  connected: { labelKey: 'mcp.status.connected', tone: 'connected' },
  stopping: { labelKey: 'mcp.status.stopping', tone: 'pending' },
  error: { labelKey: 'mcp.status.error', tone: 'error' },
}

export const getMcpStatusPresentation = (
  status: McpSessionStatus,
  editing = false,
  recoveryRequired = false,
): McpStatusPresentation => recoveryRequired
  ? { labelKey: 'mcp.edit.recovery', tone: 'editing' }
  : editing && (status === 'available' || status === 'connected')
  ? { labelKey: 'mcp.edit.active', tone: 'editing' }
  : status === 'stopped' ? { labelKey: 'mcp.edit.recovery', tone: 'editing' } : presentations[status]

export const shortenMcpSessionId = (sessionId: string): string => sessionId.slice(0, 8)
