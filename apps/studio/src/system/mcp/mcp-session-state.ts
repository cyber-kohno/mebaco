import { writable } from 'svelte/store'
import type { McpSessionStatus } from './mcp-types'
import type TauriMcp from '@system/infra/tauri/mcp'
import McpEditSessionState from './mcp-edit-session-state'

namespace McpSessionState {
  export const store = writable<McpSessionStatus>('stopped')
  export const detailsStore = writable<TauriMcp.StartResult | null>(null)

  export const set = (status: McpSessionStatus): void => {
    store.set(status)
  }

  export const reset = (): void => {
    McpEditSessionState.requireRecovery()
    store.set('stopped')
    detailsStore.set(null)
  }
}

export default McpSessionState
