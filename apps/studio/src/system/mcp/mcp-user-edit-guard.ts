import McpEditSessionState from './mcp-edit-session-state'
import ToastController from '@system/ui/feedback/toast/toast-controller'

namespace McpUserEditGuard {
  export const assertAllowed = (): void => {
    try { McpEditSessionState.assertUserEditAllowed() }
    catch (error) {
      if (error instanceof McpEditSessionState.Error) {
        ToastController.show(error.message, { tone: 'danger', durationMs: 4000 })
      }
      throw error
    }
  }
  export const allows = (): boolean => {
    try { assertAllowed(); return true } catch { return false }
  }
}

export default McpUserEditGuard
