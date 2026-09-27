import ProjectFile from '../project/project-file'
import ProjectGuard from '../project/project-guard'
import { developScreenStore } from './develop-screen-store'
import McpSessionController from '../mcp/mcp-session-controller'
import ToastController from '@system/ui/feedback/toast/toast-controller'

namespace DevelopProjectController {
  export const startEmpty = () => {
    ProjectFile.startEmpty()
    developScreenStore.set('workspace')
  }

  export const openFileWithAlert = async () => {
    if (await ProjectFile.openFileWithAlert()) {
      developScreenStore.set('workspace')
    }
  }

  export const close = async () => {
    if (!await ProjectGuard.confirmDiscard()) return

    const shouldStopMcp = McpSessionController.getStatus() !== 'stopped'
    const mcpResult = shouldStopMcp ? await McpSessionController.stop() : null
    ProjectFile.close()
    developScreenStore.set('home')
    if (mcpResult?.outcome === 'changed') {
      ToastController.show('MCP development session stopped because the project was closed.', {
        tone: 'success',
        durationMs: 4000,
      })
    } else if (mcpResult?.outcome === 'rejected') {
      ToastController.show(mcpResult.message, {
        tone: 'danger',
        durationMs: 5000,
      })
    }
  }
}

export default DevelopProjectController
