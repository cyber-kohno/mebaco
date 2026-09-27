import ToastController from '@system/ui/feedback/toast/toast-controller'
import McpSessionController from './mcp-session-controller'

namespace McpExitGuard {
  export const stopBeforeExit = async (): Promise<boolean> => {
    const result = await McpSessionController.stop()
    if (result.outcome === 'rejected') {
      ToastController.show(result.message, {
        tone: 'danger',
        durationMs: 5000,
      })
      return false
    }
    return true
  }
}

export default McpExitGuard
