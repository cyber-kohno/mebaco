import { relaunch } from '@tauri-apps/plugin-process'

namespace TauriProcess {
  export const relaunchApp = (): Promise<void> => relaunch()
}

export default TauriProcess
