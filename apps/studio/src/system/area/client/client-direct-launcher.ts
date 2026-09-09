import type { ClientLaunchRequest } from '../../infra/tauri/client-launch'
import ClientLauncher from './client-launcher'
import ClientPackage from './client-package'
import ClientPackageStore from './client-package-store'

namespace ClientDirectLauncher {
  export type Result =
    | { status: 'opened'; title: string }
    | { status: 'invalid'; message: string; installationId?: string }

  export const open = async (request: ClientLaunchRequest): Promise<Result> => {
    if (request.workspaceId !== 'default') {
      return { status: 'invalid', message: 'The requested client workspace is not available.' }
    }

    await ClientPackageStore.initialize()
    const installedPackage = ClientPackageStore.find(request.installationId)
    if (installedPackage == null) {
      return {
        status: 'invalid',
        message: 'The application package used by this shortcut is not installed.',
      }
    }
    if (installedPackage.manifest.bundle.bundleId !== request.bundleId) {
      return {
        status: 'invalid',
        message: 'The shortcut does not match the installed application package.',
        installationId: installedPackage.installationId,
      }
    }

    const launcher = installedPackage.module.launchers.find((item) => (
      item.launcherId === request.launcherId
    ))
    const result = await ClientLauncher.open(installedPackage, request.launcherId)
    if (result.status !== 'opened') {
      return {
        ...result,
        installationId: installedPackage.installationId,
      }
    }

    return {
      status: 'opened',
      title: `${launcher == null ? 'Mebaco App' : ClientPackage.launcherLabel(launcher)} - Mebaco`,
    }
  }
}

export default ClientDirectLauncher
