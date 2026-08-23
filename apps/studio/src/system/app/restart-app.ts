import { relaunch } from '@tauri-apps/plugin-process'
import ProjectGuard from '../project/project-guard'

export const restartApp = async () => {
  if (!await ProjectGuard.confirmDiscard()) return

  if (import.meta.env.DEV) {
    const restartUrl = new URL(window.location.href)
    restartUrl.searchParams.set('restart', Date.now().toString())
    window.location.replace(restartUrl)
    return
  }

  await relaunch()
}
