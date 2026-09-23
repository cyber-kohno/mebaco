import { BaseDirectory } from '@tauri-apps/api/path'

export type ClientInstallLocation = {
  path: string
  baseDir: BaseDirectory
}

namespace ClientInstallLocation {
  export const resolve = (): ClientInstallLocation => ({
    path: 'client/install/default',
    baseDir: BaseDirectory.AppLocalData,
  })
}

export default ClientInstallLocation
