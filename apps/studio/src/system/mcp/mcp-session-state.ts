import { writable } from 'svelte/store'
import type { McpSessionStatus } from './mcp-types'
import type TauriMcp from '@system/infra/tauri/mcp'

namespace McpSessionState {
  export const store = writable<McpSessionStatus>('stopped')
  export const detailsStore = writable<TauriMcp.StartResult | null>(null)

  export const set = (status: McpSessionStatus): void => {
    store.set(status)
  }

  export const reset = (): void => {
    store.set('stopped')
    detailsStore.set(null)
  }
}

export default McpSessionState
