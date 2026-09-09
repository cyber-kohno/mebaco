import ClientPackage from './client-package'
import ClientResourcePathValidator from './client-resource-path-validator'
import PreviewController from '../../runtime/preview/preview-controller'
import TauriResourcePathValidation from '../../infra/tauri/resource-path-validation'
import type ResourceImportCatalog from '../../element/kind/app/import/resource-import-catalog'

namespace ClientLauncher {
  export type ResourceValidation = (
    resource: ResourceImportCatalog.ResourceElement,
    path: string,
  ) => Promise<boolean>

  export type Result =
    | { status: 'opened' }
    | { status: 'invalid'; message: string }

  const validateResource: ResourceValidation = async (resource, path) => {
    if (path.trim().length === 0) return false
    try {
      const result = await TauriResourcePathValidation.validate(
        ClientResourcePathValidator.createRequest(resource, path),
      )
      return result.status === 'valid' || result.status === 'creatable'
    } catch {
      return false
    }
  }

  export const open = async (
    installedPackage: ClientPackage.Installed,
    launcherId: string,
    options: { validateResource?: ResourceValidation } = {},
  ): Promise<Result> => {
    const launcher = installedPackage.module.launchers.find((item) => (
      item.launcherId === launcherId
    ))
    if (launcher?.appId == null) {
      return { status: 'invalid', message: 'The selected Launcher is not available.' }
    }

    const analysis = ClientPackage.analyzeLauncher(installedPackage, launcherId)
    if (analysis.errors.length > 0) {
      return { status: 'invalid', message: analysis.errors[0] }
    }

    const check = options.validateResource ?? validateResource
    const resourcesReady = await Promise.all(analysis.resources.map((resource) => (
      check(resource.element, installedPackage.resourcePaths[resource.element.resourceId] ?? '')
    )))
    if (!resourcesReady.every(Boolean)) {
      return { status: 'invalid', message: 'The Launcher resource configuration is incomplete.' }
    }

    const opened = PreviewController.open({
      projectNode: ClientPackage.createRuntimeProject(installedPackage),
      appDefinitionId: launcher.appId,
      launcherId: launcher.launcherId,
      resourcePaths: installedPackage.resourcePaths,
      storageScope: {
        kind: 'package',
        id: installedPackage.manifest?.bundle.bundleId
          ?? installedPackage.module.bundle?.bundleId
          ?? installedPackage.installationId,
      },
    })
    return opened
      ? { status: 'opened' }
      : { status: 'invalid', message: 'The selected Launcher could not be opened.' }
  }
}

export default ClientLauncher
