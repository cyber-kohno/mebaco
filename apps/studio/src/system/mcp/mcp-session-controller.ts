import { get } from 'svelte/store'
import ProjectSession from '@system/project/project-session-store'
import McpSessionState from './mcp-session-state'
import type { McpSessionActionResult, McpSessionStatus } from './mcp-types'
import TauriMcp from '@system/infra/tauri/mcp'

namespace McpSessionController {
  let dirtySyncQueue = Promise.resolve()

  export const getStatus = (): McpSessionStatus => get(McpSessionState.store)

  export const getDetails = (): TauriMcp.StartResult | null => get(McpSessionState.detailsStore)

  export const start = async (): Promise<McpSessionActionResult> => {
    const project = get(ProjectSession.store)
    if (project.savedFingerprint == null) {
      return {
        outcome: 'rejected',
        status: getStatus(),
        message: 'Open or create a project before starting an MCP development session.',
      }
    }

    const current = getStatus()
    if (current === 'starting' || current === 'available' || current === 'connected') {
      return {
        outcome: 'unchanged',
        status: current,
        message: 'MCP development session is already available.',
      }
    }

    McpSessionState.set('starting')
    try {
      const details = await TauriMcp.startSession({
        projectDisplayName: project.fileName ?? 'Untitled project',
        dirty: project.isDirty,
      })
      await TauriMcp.probeSession()
      McpSessionState.detailsStore.set(details)
      McpSessionState.set('available')
      return {
        outcome: 'changed',
        status: 'available',
        message: [
          'MCP development session is available.',
          `Session ID: ${details.sessionId}`,
          `Endpoint: ${details.endpoint}`,
          `PID: ${details.pid}`,
        ].join('\n'),
      }
    } catch (error) {
      try {
        await TauriMcp.stopSession()
      } catch {
        // Preserve the original start/probe failure in the terminal output.
      }
      McpSessionState.set('error')
      McpSessionState.detailsStore.set(null)
      return {
        outcome: 'rejected',
        status: 'error',
        message: `MCP development session could not be started: ${String(error)}`,
      }
    }
  }

  export const stop = async (): Promise<McpSessionActionResult> => {
    const current = getStatus()
    if (current === 'stopped') {
      return {
        outcome: 'unchanged',
        status: current,
        message: 'MCP development session is not running.',
      }
    }

    McpSessionState.set('stopping')
    try {
      await TauriMcp.stopSession()
      McpSessionState.detailsStore.set(null)
      McpSessionState.set('stopped')
      return {
        outcome: 'changed',
        status: 'stopped',
        message: 'MCP development session stopped.',
      }
    } catch (error) {
      McpSessionState.set('error')
      return {
        outcome: 'rejected',
        status: 'error',
        message: `MCP development session could not be stopped: ${String(error)}`,
      }
    }
  }

  export const syncDirty = (dirty: boolean): Promise<void> => {
    dirtySyncQueue = dirtySyncQueue.then(async () => {
      const current = getStatus()
      if (current !== 'available' && current !== 'connected') return
      try {
        await TauriMcp.updateSessionDirty(dirty)
      } catch {
        // The session may stop between the status check and the native call.
      }
    })
    return dirtySyncQueue
  }
}

export default McpSessionController
