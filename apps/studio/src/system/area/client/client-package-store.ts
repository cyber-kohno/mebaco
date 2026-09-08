import { get, writable } from 'svelte/store'
import type ClientPackage from './client-package'
import ClientPackageRepository, { type LoadResult } from './client-package-repository'

export type ClientPackageState = {
  packages: ClientPackage.Installed[]
  selectedId: string | null
}

const initialState = (): ClientPackageState => ({ packages: [], selectedId: null })
const store = writable<ClientPackageState>(initialState())
let initialization: Promise<LoadResult> | null = null
const metadataSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

namespace ClientPackageStore {
  export const value = store

  export const initialize = (): Promise<LoadResult> => {
    if (initialization != null) return initialization
    initialization = ClientPackageRepository.load().then((result) => {
      store.set({ packages: result.packages, selectedId: null })
      return result
    }).catch((error) => {
      initialization = null
      throw error
    })
    return initialization
  }

  export const getSelected = (state: ClientPackageState): ClientPackage.Installed | null => (
    state.packages.find((item) => item.installationId === state.selectedId) ?? null
  )

  const uniqueName = (sourceFileName: string, packages: readonly ClientPackage.Installed[]): string => {
    const names = new Set(packages.map((item) => item.displayName.toLocaleLowerCase()))
    if (!names.has(sourceFileName.toLocaleLowerCase())) return sourceFileName
    const extensionIndex = sourceFileName.toLocaleLowerCase().lastIndexOf('.mbcapp')
    const base = extensionIndex < 0 ? sourceFileName : sourceFileName.slice(0, extensionIndex)
    const extension = extensionIndex < 0 ? '' : sourceFileName.slice(extensionIndex)
    let index = 2
    while (names.has(`${base} (${index})${extension}`.toLocaleLowerCase())) index += 1
    return `${base} (${index})${extension}`
  }

  export const install = async (
    parsed: ClientPackage.Parsed,
  ): Promise<{
    status: 'installed' | 'updated' | 'duplicate'
    installedPackage: ClientPackage.Installed
  }> => {
    await initialize()
    const current = get(store)
    const duplicate = current.packages.find((item) => item.digest === parsed.digest)
    if (duplicate != null) {
      store.set({ ...current, selectedId: duplicate.installationId })
      return { status: 'duplicate', installedPackage: duplicate }
    }

    const previous = current.packages.find((item) => (
      item.manifest.bundle.bundleId === parsed.manifest.bundle.bundleId
    ))
    const installedPackage: ClientPackage.Installed = previous == null
      ? {
          ...parsed,
          installationId: crypto.randomUUID(),
          displayName: uniqueName(parsed.sourceFileName, current.packages),
          installedAt: new Date().toISOString(),
          resourcePaths: {},
        }
      : {
          ...parsed,
          installationId: previous.installationId,
          displayName: previous.displayName,
          installedAt: previous.installedAt,
          resourcePaths: Object.fromEntries(Object.entries(previous.resourcePaths).filter(([resourceId]) => (
            parsed.module.resources.some((resource) => resource.resourceId === resourceId)
          ))),
        }
    await ClientPackageRepository.save(installedPackage)
    store.set({
      packages: previous == null
        ? [...current.packages, installedPackage]
        : current.packages.map((item) => (
            item.installationId === previous.installationId ? installedPackage : item
          )),
      selectedId: installedPackage.installationId,
    })
    return { status: previous == null ? 'installed' : 'updated', installedPackage }
  }

  export const toggleSelection = (installationId: string) => store.update((state) => ({
    ...state,
    selectedId: state.packages.some((item) => item.installationId === installationId)
      ? (state.selectedId === installationId ? null : installationId)
      : state.selectedId,
  }))

  export const rename = (installationId: string, displayName: string): boolean => {
    const normalized = displayName.trim()
    if (normalized.length === 0) return false
    store.update((state) => {
      const packages = state.packages.map((item) => item.installationId === installationId
        ? { ...item, displayName: normalized }
        : item)
      const installedPackage = packages.find((item) => item.installationId === installationId)
      if (installedPackage != null) void ClientPackageRepository.saveMetadata(installedPackage)
        .catch((error) => console.error('Could not save the package display name.', error))
      return { ...state, packages }
    })
    return true
  }

  export const remove = async (installationId: string): Promise<void> => {
    await initialize()
    const installedPackage = find(installationId)
    if (installedPackage == null) return
    const timer = metadataSaveTimers.get(installationId)
    if (timer != null) clearTimeout(timer)
    metadataSaveTimers.delete(installationId)
    await ClientPackageRepository.deletePackage(installedPackage)
    store.update((state) => {
      if (!state.packages.some((item) => item.installationId === installationId)) return state
      const packages = state.packages.filter((item) => item.installationId !== installationId)
      return {
        packages,
        selectedId: state.selectedId === installationId ? null : state.selectedId,
      }
    })
  }

  export const setResourcePath = (
    installationId: string,
    resourceId: string,
    path: string,
  ) => store.update((state) => {
    const packages = state.packages.map((item) => item.installationId === installationId
      ? { ...item, resourcePaths: { ...item.resourcePaths, [resourceId]: path } }
      : item)
    const timer = metadataSaveTimers.get(installationId)
    if (timer != null) clearTimeout(timer)
    metadataSaveTimers.set(installationId, setTimeout(() => {
      metadataSaveTimers.delete(installationId)
      const installedPackage = find(installationId)
      if (installedPackage != null) void ClientPackageRepository.saveMetadata(installedPackage)
        .catch((error) => console.error('Could not save the package resource paths.', error))
    }, 300))
    return { ...state, packages }
  })

  export const find = (installationId: string): ClientPackage.Installed | null => (
    get(store).packages.find((item) => item.installationId === installationId) ?? null
  )

  export const reset = () => {
    metadataSaveTimers.forEach((timer) => clearTimeout(timer))
    metadataSaveTimers.clear()
    store.set(initialState())
  }
}

export default ClientPackageStore
