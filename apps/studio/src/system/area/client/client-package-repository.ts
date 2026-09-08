import { isTauri } from '@tauri-apps/api/core'
import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import ClientInstallLocation from './client-install-location'
import ClientPackage from './client-package'

type InstallationMetadata = {
  format: 'mebaco-client-installation'
  formatVersion: 1
  bundleId: string
  installationId: string
  sourceFileName: string
  displayName: string
  installedAt: string
  digest: string
  resourcePaths: Record<string, string>
}

export type LoadResult = {
  packages: ClientPackage.Installed[]
  warnings: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value != null && !Array.isArray(value)
)

const parseMetadata = (source: string): InstallationMetadata => {
  const value = JSON.parse(source) as unknown
  if (
    !isRecord(value)
    || value.format !== 'mebaco-client-installation'
    || value.formatVersion !== 1
    || typeof value.bundleId !== 'string'
    || typeof value.installationId !== 'string'
    || typeof value.sourceFileName !== 'string'
    || typeof value.displayName !== 'string'
    || typeof value.installedAt !== 'string'
    || typeof value.digest !== 'string'
    || !isRecord(value.resourcePaths)
    || !Object.values(value.resourcePaths).every((path) => typeof path === 'string')
  ) throw new Error('installation.json is incomplete or invalid.')
  return value as InstallationMetadata
}

const metadataOf = (installedPackage: ClientPackage.Installed): InstallationMetadata => ({
  format: 'mebaco-client-installation',
  formatVersion: 1,
  bundleId: installedPackage.manifest.bundle.bundleId,
  installationId: installedPackage.installationId,
  sourceFileName: installedPackage.sourceFileName,
  displayName: installedPackage.displayName,
  installedAt: installedPackage.installedAt,
  digest: installedPackage.digest,
  resourcePaths: { ...installedPackage.resourcePaths },
})

const packagesPath = (root: string) => `${root}/packages`

const digestText = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')
}

const bundleFolderName = async (bundleId: string): Promise<string> => {
  if (/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(bundleId)) return bundleId
  return `bundle-${await digestText(bundleId)}`
}

const packagePath = async (root: string, bundleId: string): Promise<string> => (
  `${packagesPath(root)}/${await bundleFolderName(bundleId)}`
)

const ensureWorkspace = async (): Promise<void> => {
  const location = ClientInstallLocation.resolve()
  await mkdir(packagesPath(location.path), { recursive: true, baseDir: location.baseDir })
  const workspacePath = `${location.path}/workspace.json`
  if (!await exists(workspacePath, { baseDir: location.baseDir })) {
    await writeTextFile(workspacePath, JSON.stringify({
      format: 'mebaco-client-workspace',
      formatVersion: 1,
      id: 'default',
    }, null, 2), { baseDir: location.baseDir })
  }
}

namespace ClientPackageRepository {
  export const load = async (): Promise<LoadResult> => {
    if (!isTauri()) return { packages: [], warnings: [] }
    await ensureWorkspace()
    const location = ClientInstallLocation.resolve()
    const entries = await readDir(packagesPath(location.path), { baseDir: location.baseDir })
    const packages: ClientPackage.Installed[] = []
    const warnings: string[] = []

    for (const entry of entries) {
      if (!entry.isDirectory) continue
      const directory = `${packagesPath(location.path)}/${entry.name}`
      try {
        const metadata = parseMetadata(await readTextFile(
          `${directory}/installation.json`,
          { baseDir: location.baseDir },
        ))
        const archiveBytes = await readFile(
          `${directory}/package.mbcapp`,
          { baseDir: location.baseDir },
        )
        const parsed = await ClientPackage.parse(metadata.sourceFileName, archiveBytes)
        if (
          parsed.digest !== metadata.digest
          || parsed.manifest.bundle.bundleId !== metadata.bundleId
        ) throw new Error('The package does not match its installation metadata.')
        packages.push({
          ...parsed,
          installationId: metadata.installationId,
          displayName: metadata.displayName,
          installedAt: metadata.installedAt,
          resourcePaths: metadata.resourcePaths,
        })
      } catch (error) {
        warnings.push(`${entry.name}: ${error instanceof Error ? error.message : 'could not be loaded.'}`)
      }
    }

    packages.sort((left, right) => left.installedAt.localeCompare(right.installedAt))
    return { packages, warnings }
  }

  export const save = async (installedPackage: ClientPackage.Installed): Promise<void> => {
    if (!isTauri()) return
    await ensureWorkspace()
    const location = ClientInstallLocation.resolve()
    const directory = await packagePath(
      location.path,
      installedPackage.manifest.bundle.bundleId,
    )
    await mkdir(directory, { recursive: true, baseDir: location.baseDir })
    await writeFile(
      `${directory}/package.mbcapp`,
      installedPackage.archiveBytes,
      { baseDir: location.baseDir },
    )
    await writeTextFile(
      `${directory}/installation.json`,
      JSON.stringify(metadataOf(installedPackage), null, 2),
      { baseDir: location.baseDir },
    )
  }

  export const saveMetadata = async (installedPackage: ClientPackage.Installed): Promise<void> => {
    if (!isTauri()) return
    const location = ClientInstallLocation.resolve()
    const directory = await packagePath(
      location.path,
      installedPackage.manifest.bundle.bundleId,
    )
    await writeTextFile(
      `${directory}/installation.json`,
      JSON.stringify(metadataOf(installedPackage), null, 2),
      { baseDir: location.baseDir },
    )
  }

  export const deletePackage = async (installedPackage: ClientPackage.Installed): Promise<void> => {
    if (!isTauri()) return
    const location = ClientInstallLocation.resolve()
    const directory = await packagePath(
      location.path,
      installedPackage.manifest.bundle.bundleId,
    )
    if (await exists(directory, { baseDir: location.baseDir })) {
      await remove(directory, { recursive: true, baseDir: location.baseDir })
    }
  }
}

export default ClientPackageRepository
