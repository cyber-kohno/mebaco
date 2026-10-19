import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

namespace TauriMcp {
  export type Diagnostics = {
    sessionId: string | null
    identity: {
      releaseVersion: string
      bridgeProtocolGen: number
      apiGen: number
      schemaGen: number
    }
    accepted: number
    rejected: number
    history: {
      code: string
      studioGen: number
      peerGen: number | null
      count: number
      lastAtEpochMs: number
    }[]
  }
  export const diagnostics = (): Promise<Diagnostics> =>
    invoke('mcp_diagnostics')
  export type StartRequest = {
    projectDisplayName: string
    dirty: boolean
  }

  export type StartResult = {
    sessionId: string
    endpoint: string
    pid: number
  }

  export type BridgeRequest = {
    id: string
    method: string
    params: unknown
  }

  export type BridgeError = {
    code: string
    message: string
    expectedRevision?: number
    actualRevision?: number
  }

  export type BridgeResponse = {
    id: string
    result?: unknown
    error?: BridgeError
  }

  export const startSession = (request: StartRequest): Promise<StartResult> =>
    invoke('mcp_start_session', { request })

  export const stopSession = (): Promise<void> => invoke('mcp_stop_session')

  export const updateSessionDirty = (dirty: boolean): Promise<void> =>
    invoke('mcp_update_session_dirty', { dirty })

  export const probeSession = (): Promise<unknown> =>
    invoke('mcp_probe_session')

  export const respond = (response: BridgeResponse): Promise<void> =>
    invoke('mcp_respond', { response })

  export const onRequest = (
    handler: (request: BridgeRequest) => void | Promise<void>,
  ): Promise<() => void> =>
    listen<BridgeRequest>('mebaco://mcp/request', (event) => {
      void handler(event.payload)
    })
}

export default TauriMcp
