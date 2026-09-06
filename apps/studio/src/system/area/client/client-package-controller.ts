import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import ToastController from '../../feedback/toast/toast-controller'
import ClientPackage from './client-package'
import ClientPackageStore from './client-package-store'

namespace ClientPackageController {
  export const installFile = async (file: File): Promise<void> => {
    try {
      const parsed = await ClientPackage.parse(file.name, await file.arrayBuffer())
      const result = ClientPackageStore.install(parsed)
      if (result.status === 'duplicate') {
        ToastController.show('This application package is already installed.', { tone: 'warning' })
        return
      }
      ToastController.show(`${result.installedPackage.displayName} was installed.`, { tone: 'success' })
    } catch (error) {
      await ConfirmDialogController.openNotice({
        title: 'Application Package could not be installed',
        message: error instanceof Error ? error.message : 'The selected package could not be read.',
      })
    }
  }

  export const deletePackage = async (installationId: string): Promise<void> => {
    const installedPackage = ClientPackageStore.find(installationId)
    if (installedPackage == null) return
    const confirmed = await ConfirmDialogController.open({
      tone: 'danger',
      title: 'Delete Application Package',
      message: `Delete '${installedPackage.displayName}' and its launch configuration?`,
      choices: [{ label: 'Delete', role: 'proceed' }],
    })
    if (!confirmed) return
    ClientPackageStore.remove(installationId)
    ToastController.show(`${installedPackage.displayName} was deleted.`, { tone: 'success' })
  }
}

export default ClientPackageController
