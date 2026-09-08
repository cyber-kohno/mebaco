import JSZip from 'jszip'
import type MebacoElement from '../../element/element'
import type LauncherElement from '../../element/kind/project/launcher-element'
import type ResourceImportCatalog from '../../element/kind/app/import/resource-import-catalog'
import type ReleasePackage from '../../release/release-package'
import ReleaseBundle from '../../release/release-bundle'
import type TreeNode from '../../tree/tree-node'
import { API_GEN, SCHEMA_GEN } from '../../version'
import ReleaseContentHash from '../../release/release-content-hash'

namespace ClientPackage {
  export class InvalidPackageError extends Error {}

  export type Parsed = {
    sourceFileName: string
    byteLength: number
    archiveBytes: Uint8Array
    digest: string
    manifest: ReleasePackage.Manifest
    module: ReleasePackage.ModuleJson
  }

  export type Installed = Parsed & {
    installationId: string
    displayName: string
    installedAt: string
    updatedAt: string
    resourcePaths: Readonly<Record<string, string>>
  }

  const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value != null && !Array.isArray(value)
  )

  const readJson = async (zip: JSZip, path: string): Promise<unknown> => {
    const entry = zip.file(path)
    if (entry == null) throw new InvalidPackageError(`The package does not contain ${path}.`)
    try {
      return JSON.parse(await entry.async('string')) as unknown
    } catch {
      throw new InvalidPackageError(`${path} is not valid JSON.`)
    }
  }

  const validateManifest = (value: unknown): ReleasePackage.Manifest => {
    if (!isRecord(value) || value.format !== 'mebaco-app' || value.formatVersion !== 1) {
      throw new InvalidPackageError('This is not a supported Mebaco Application Package.')
    }
    if (
      typeof value.appVersion !== 'string'
      || typeof value.schemaGen !== 'number'
      || typeof value.apiGen !== 'number'
      || typeof value.createdAt !== 'string'
      || !isRecord(value.bundle)
      || typeof value.bundle.bundleId !== 'string'
      || typeof value.bundle.id !== 'string'
      || !Number.isInteger(value.bundle.generation)
      || (value.bundle.generation as number) < 1
      || typeof value.bundle.contentHash !== 'string'
      || !/^[0-9a-f]{64}$/.test(value.bundle.contentHash)
      || typeof value.bundle.builtAt !== 'string'
      || typeof value.bundle.launcherCount !== 'number'
      || typeof value.bundle.appCount !== 'number'
      || typeof value.bundle.resourceCount !== 'number'
    ) throw new InvalidPackageError('manifest.json is incomplete.')
    if (value.schemaGen !== SCHEMA_GEN) {
      throw new InvalidPackageError(`Schema generation ${value.schemaGen} is not compatible with this client (${SCHEMA_GEN}).`)
    }
    if (value.apiGen !== API_GEN) {
      throw new InvalidPackageError(`API generation ${value.apiGen} is not compatible with this client (${API_GEN}).`)
    }
    return value as ReleasePackage.Manifest
  }

  const validateModule = (
    value: unknown,
    manifest: ReleasePackage.Manifest,
  ): ReleasePackage.ModuleJson => {
    if (
      !isRecord(value)
      || !isRecord(value.bundle)
      || typeof value.bundle.bundleId !== 'string'
      || typeof value.bundle.id !== 'string'
      || !Array.isArray(value.bundle.launcherIds)
      || !value.bundle.launcherIds.every((id) => typeof id === 'string')
      || !Array.isArray(value.launchers)
      || !value.launchers.every((launcher) => isRecord(launcher)
        && launcher.kind === 'launcher'
        && typeof launcher.launcherId === 'string'
        && typeof launcher.id === 'string')
      || !Array.isArray(value.apps)
      || !value.apps.every((app) => isRecord(app)
        && isRecord(app.element)
        && app.element.kind === 'app'
        && Array.isArray(app.children))
      || !(value.common == null || (isRecord(value.common) && Array.isArray(value.common.children)))
      || !Array.isArray(value.resources)
      || !value.resources.every((resource) => isRecord(resource)
        && typeof resource.resourceId === 'string'
        && typeof resource.id === 'string'
        && (resource.name == null || typeof resource.name === 'string')
        && ['directory-resource', 'text-resource', 'sqlite-resource'].includes(String(resource.kind)))
    ) throw new InvalidPackageError('module.json is incomplete or invalid.')

    if (value.bundle.bundleId !== manifest.bundle.bundleId || value.bundle.id !== manifest.bundle.id) {
      throw new InvalidPackageError('The Bundle identity does not match the manifest.')
    }
    if (
      value.launchers.length !== manifest.bundle.launcherCount
      || value.apps.length !== manifest.bundle.appCount
      || value.resources.length !== manifest.bundle.resourceCount
    ) throw new InvalidPackageError('The package contents do not match the manifest counts.')

    const launcherIds = new Set(value.launchers.map((launcher) => (
      isRecord(launcher) ? launcher.launcherId : null
    )))
    if (!value.bundle.launcherIds.every((id) => launcherIds.has(id))) {
      throw new InvalidPackageError('The Bundle references a missing Launcher.')
    }
    return value as ReleasePackage.ModuleJson
  }

  const createDigest = async (bytes: Uint8Array): Promise<string> => {
    const hash = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes))
    return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('')
  }

  export const parse = async (
    sourceFileName: string,
    source: ArrayBuffer | Uint8Array,
  ): Promise<Parsed> => {
    if (!sourceFileName.toLowerCase().endsWith('.mbcapp')) {
      throw new InvalidPackageError('Select a .mbcapp file.')
    }
    const bytes = source instanceof Uint8Array ? Uint8Array.from(source) : new Uint8Array(source)
    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(bytes)
    } catch {
      throw new InvalidPackageError('The selected file is not a valid application package.')
    }
    const manifest = validateManifest(await readJson(zip, 'manifest.json'))
    const module = validateModule(await readJson(zip, 'module.json'), manifest)
    if (await ReleaseContentHash.create(module) !== manifest.bundle.contentHash) {
      throw new InvalidPackageError('The package content does not match its built revision.')
    }
    return {
      sourceFileName,
      byteLength: bytes.byteLength,
      archiveBytes: bytes,
      digest: await createDigest(bytes),
      manifest,
      module,
    }
  }

  const syntheticNode = (
    id: number,
    element: MebacoElement.Element,
    children: TreeNode.Node[] = [],
  ): TreeNode.Node => ({ id, element, isOpen: true, children })

  export const analyzeLauncher = (
    installedPackage: Installed,
    launcherId: string,
  ): ReleaseBundle.Analysis => ReleaseBundle.analyze(
    createRuntimeProject(installedPackage),
    [launcherId],
  )

  export const createRuntimeProject = (
    installedPackage: Installed,
  ): TreeNode.Node => {
    let nextId = -2
    const launcherNodes = installedPackage.module.launchers.map((element) => (
      syntheticNode(nextId--, element as LauncherElement.Element)
    ))
    const resourceNodes = installedPackage.module.resources.map((element) => (
      syntheticNode(nextId--, element as ResourceImportCatalog.ResourceElement)
    ))
    const root = syntheticNode(-1, { kind: 'project' }, [
      ...installedPackage.module.apps,
      ...launcherNodes,
      ...(installedPackage.module.common == null ? [] : [installedPackage.module.common]),
      ...resourceNodes,
    ])
    return root
  }

  export const launcherLabel = (launcher: LauncherElement.Element): string => (
    launcher.name?.trim() || launcher.id
  )

  export const resourceKindLabel = ReleaseBundle.getResourceKindLabel

  export const resourceLabel = (resource: ResourceImportCatalog.ResourceElement): string => (
    resource.name?.trim() || resource.id
  )
}

export default ClientPackage
