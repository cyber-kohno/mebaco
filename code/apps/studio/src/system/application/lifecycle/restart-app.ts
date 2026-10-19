import ProjectGuard from '../../project/project-guard'
import TauriProcess from '../../infra/tauri/process'
import McpExitGuard from '../../mcp/mcp-exit-guard'

export const restartApp = async () => {
  if (!await ProjectGuard.confirmDiscard()) return
  if (!await McpExitGuard.stopBeforeExit()) return

  if (import.meta.env.DEV) {
    const restartUrl = new URL(window.location.href)
    restartUrl.searchParams.set('restart', Date.now().toString())
    window.location.replace(restartUrl)
    return
  }

  await TauriProcess.relaunchApp()
}
