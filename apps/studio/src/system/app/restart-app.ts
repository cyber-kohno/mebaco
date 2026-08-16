import { relaunch } from '@tauri-apps/plugin-process'

export const restartApp = async () => {
  if (import.meta.env.DEV) {
    const restartUrl = new URL(window.location.href)
    restartUrl.searchParams.set('restart', Date.now().toString())
    window.location.replace(restartUrl)
    return
  }

  await relaunch()
}
