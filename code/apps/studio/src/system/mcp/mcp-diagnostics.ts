import type TauriMcp from '@system/infra/tauri/mcp'
import type { MessageKey } from '@system/application/localization'

export const rejectionLabel = (code: string): MessageKey => {
  switch (code) {
    case 'MCP_CONTRACT_REQUIRED':
      return 'mcp.diagnostics.required'
    case 'MCP_BRIDGE_GENERATION_MISMATCH':
      return 'mcp.diagnostics.mismatch'
    case 'MCP_SESSION_MISMATCH':
      return 'mcp.diagnostics.sessionMismatch'
    default:
      return 'mcp.diagnostics.invalid'
  }
}

export type DiagnosticsState = {
  snapshot: TauriMcp.Diagnostics | null
  failed: boolean
}

/** Read-after-completion polling. Responses from stopped/replaced sessions are discarded. */
export const createDiagnosticsPoller = (
  read: () => Promise<TauriMcp.Diagnostics>,
  publish: (state: DiagnosticsState) => void,
) => {
  let epoch = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    epoch++
    clearTimeout(timer)
    timer = undefined
  }
  const start = (sessionId: string) => {
    stop()
    const current = epoch
    publish({ snapshot: null, failed: false })
    const poll = async () => {
      try {
        const snapshot = await read()
        if (current !== epoch) return
        publish(
          snapshot.sessionId === sessionId
            ? { snapshot, failed: false }
            : { snapshot: null, failed: true },
        )
      } catch {
        if (current !== epoch) return
        publish({ snapshot: null, failed: true })
      }
      if (current === epoch)
        timer = setTimeout(() => {
          void poll()
        }, 1000)
    }
    void poll()
  }
  return { start, stop }
}
