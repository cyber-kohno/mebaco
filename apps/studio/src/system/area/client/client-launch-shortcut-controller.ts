import ClientPackage from './client-package'
import NativeDialogController from '../../ui/native-dialog-controller'
import TauriClientLaunch from '../../infra/tauri/client-launch'

namespace ClientLaunchShortcutController {
  const ensureExtension = (path: string): string => (
    path.toLocaleLowerCase().endsWith('.lnk') ? path : `${path}.lnk`
  )

  const safeFilePart = (value: string): string => (
    value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[ .]+$/g, '').trim()
  )

  const packageLabel = (installedPackage: ClientPackage.Installed): string => {
    const displayName = installedPackage.displayName.replace(/\.mbcapp$/i, '')
    return safeFilePart(displayName) || 'Mebaco App'
  }

  export const create = async (
    installedPackage: ClientPackage.Installed,
    launcherId: string,
  ): Promise<'saved' | 'cancelled'> => {
    const launcher = installedPackage.module.launchers.find((item) => (
      item.launcherId === launcherId
    ))
    if (launcher == null) throw new Error('The selected Launcher is not available.')
    const launcherLabel = safeFilePart(ClientPackage.launcherLabel(launcher)) || 'Launcher'
    const displayName = `${packageLabel(installedPackage)} - ${launcherLabel}`
    const selectedPath = await NativeDialogController.save({
      title: `Create Launcher Shortcut — ${launcherLabel}`,
      defaultPath: `${displayName}.lnk`,
      filters: [{ name: 'Windows Shortcut', extensions: ['lnk'] }],
    })
    if (selectedPath == null) return 'cancelled'

    await TauriClientLaunch.createShortcut({
      destinationPath: ensureExtension(selectedPath),
      description: `Launch ${displayName} with Mebaco`,
      launch: {
        workspaceId: 'default',
        installationId: installedPackage.installationId,
        bundleId: installedPackage.manifest.bundle.bundleId,
        launcherId,
      },
    })
    return 'saved'
  }
}

export default ClientLaunchShortcutController
