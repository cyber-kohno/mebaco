import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import ToastController from '../../feedback/toast/toast-controller'
import ClientPackage from './client-package'
import ClientPackageStore from './client-package-store'

namespace ClientPackageController {
  export const installFile = async (file: File): Promise<void> => {
    try {
      const parsed = await ClientPackage.parse(file.name, await file.arrayBuffer())
      const result = await ClientPackageStore.install(parsed)
      if (result.status === 'duplicate') {
        await ConfirmDialogController.openNotice({
          tone: 'danger',
          title: 'Application Package is already installed',
          message: `The selected file '${file.name}' matches the installed package shown as '${result.installedPackage.displayName}'.`,
        })
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

  export const updateFile = async (installationId: string, file: File): Promise<void> => {
    try {
      const parsed = await ClientPackage.parse(file.name, await file.arrayBuffer())
      const result = await ClientPackageStore.update(installationId, parsed)
      if (result.status === 'mismatch') {
        await ConfirmDialogController.openNotice({
          tone: 'danger',
          title: 'Application Package could not be updated',
          message: 'The selected file belongs to a different application. Select a package with the same Bundle UUID.',
        })
        return
      }
      if (result.status === 'unchanged') {
        await ConfirmDialogController.openNotice({
          title: 'Application Package is already up to date',
          message: 'The selected file is identical to the currently installed package.',
        })
        return
      }
      if (result.status === 'revision-conflict') {
        await ConfirmDialogController.openNotice({
          tone: 'danger',
          title: 'Application Package revision is invalid',
          message: 'The selected package has the same generation number but different content. Build a new revision before updating.',
        })
        return
      }
      if (result.status === 'downgrade') {
        const installedPackage = result.installedPackage
        if (installedPackage == null) throw new Error('The selected installation no longer exists.')
        const confirmed = await ConfirmDialogController.open({
          tone: 'danger',
          title: 'Downgrade Application Package?',
          message: [
            `The installed package is Revision ${installedPackage.manifest.bundle.generation}.`,
            `The selected package is Revision ${parsed.manifest.bundle.generation}.`,
            'Downgrading may make existing launch settings incompatible.',
          ],
          choices: [{ label: 'Downgrade', role: 'proceed' }],
        })
        if (!confirmed) return
        const downgrade = await ClientPackageStore.update(installationId, parsed, { allowDowngrade: true })
        if (downgrade.status !== 'updated' || downgrade.installedPackage == null) {
          throw new Error('The package could not be downgraded.')
        }
        ToastController.show(`${downgrade.installedPackage.displayName} was downgraded to Revision ${parsed.manifest.bundle.generation}.`, { tone: 'success' })
        return
      }
      if (result.status === 'not-found' || result.installedPackage == null) {
        throw new Error('The selected installation no longer exists.')
      }
      ToastController.show(`${result.installedPackage.displayName} was updated.`, { tone: 'success' })
    } catch (error) {
      await ConfirmDialogController.openNotice({
        tone: 'danger',
        title: 'Application Package could not be updated',
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
    await ClientPackageStore.remove(installationId)
    ToastController.show(`${installedPackage.displayName} was deleted.`, { tone: 'success' })
  }
}

export default ClientPackageController
