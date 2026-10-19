import { ConfirmDialogController } from '@system/ui/feedback/confirm'
import { ToastController } from '@system/ui/feedback/toast'
import { translate } from '@system/application/localization'
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
          title: translate('client.package.install.duplicate.title'),
          message: translate('client.package.install.duplicate.message', {
            fileName: file.name,
            displayName: result.installedPackage.displayName,
          }),
        })
        return
      }
      ToastController.show(`${result.installedPackage.displayName} was installed.`, { tone: 'success' })
    } catch (error) {
      await ConfirmDialogController.openNotice({
        title: translate('client.package.install.failed.title'),
        message: [
          translate('client.package.install.failed.message'),
          ...(error instanceof Error
            ? [translate('common.error.details', { message: error.message })]
            : []),
        ],
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
          title: translate('client.package.update.mismatch.title'),
          message: translate('client.package.update.mismatch.message'),
        })
        return
      }
      if (result.status === 'unchanged') {
        await ConfirmDialogController.openNotice({
          title: translate('client.package.update.unchanged.title'),
          message: translate('client.package.update.unchanged.message'),
        })
        return
      }
      if (result.status === 'revision-conflict') {
        await ConfirmDialogController.openNotice({
          tone: 'danger',
          title: translate('client.package.update.revisionConflict.title'),
          message: translate('client.package.update.revisionConflict.message'),
        })
        return
      }
      if (result.status === 'downgrade') {
        const installedPackage = result.installedPackage
        if (installedPackage == null) throw new Error('The selected installation no longer exists.')
        const confirmed = await ConfirmDialogController.open({
          tone: 'danger',
          title: translate('client.package.update.downgrade.title'),
          message: [
            translate('client.package.update.downgrade.installedRevision', {
              revision: installedPackage.manifest.bundle.generation,
            }),
            translate('client.package.update.downgrade.selectedRevision', {
              revision: parsed.manifest.bundle.generation,
            }),
            translate('client.package.update.downgrade.warning'),
          ],
          choices: [{
            label: translate('common.action.downgrade'),
            role: 'proceed',
          }],
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
        title: translate('client.package.update.failed.title'),
        message: [
          translate('client.package.update.failed.message'),
          ...(error instanceof Error
            ? [translate('common.error.details', { message: error.message })]
            : []),
        ],
      })
    }
  }

  export const deletePackage = async (installationId: string): Promise<void> => {
    const installedPackage = ClientPackageStore.find(installationId)
    if (installedPackage == null) return
    const confirmed = await ConfirmDialogController.open({
      tone: 'danger',
      title: translate('client.package.delete.title'),
      message: translate('client.package.delete.message', {
        displayName: installedPackage.displayName,
      }),
      choices: [{ label: translate('common.action.delete'), role: 'proceed' }],
    })
    if (!confirmed) return
    await ClientPackageStore.remove(installationId)
    ToastController.show(`${installedPackage.displayName} was deleted.`, { tone: 'success' })
  }
}

export default ClientPackageController
