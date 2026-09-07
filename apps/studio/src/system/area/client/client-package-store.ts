import { get, writable } from 'svelte/store'
import type ClientPackage from './client-package'

export type ClientPackageState = {
  packages: ClientPackage.Installed[]
  selectedId: string | null
}

const initialState = (): ClientPackageState => ({ packages: [], selectedId: null })
const store = writable<ClientPackageState>(initialState())

namespace ClientPackageStore {
  export const value = store

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

  export const install = (
    parsed: ClientPackage.Parsed,
  ): { status: 'installed' | 'duplicate'; installedPackage: ClientPackage.Installed } => {
    const current = get(store)
    const duplicate = current.packages.find((item) => item.digest === parsed.digest)
    if (duplicate != null) {
      store.set({ ...current, selectedId: duplicate.installationId })
      return { status: 'duplicate', installedPackage: duplicate }
    }
    const installedPackage: ClientPackage.Installed = {
      ...parsed,
      installationId: crypto.randomUUID(),
      displayName: uniqueName(parsed.sourceFileName, current.packages),
      installedAt: new Date().toISOString(),
      resourcePaths: {},
    }
    store.set({
      packages: [...current.packages, installedPackage],
      selectedId: installedPackage.installationId,
    })
    return { status: 'installed', installedPackage }
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
    store.update((state) => ({
      ...state,
      packages: state.packages.map((item) => item.installationId === installationId
        ? { ...item, displayName: normalized }
        : item),
    }))
    return true
  }

  export const remove = (installationId: string) => store.update((state) => {
    if (!state.packages.some((item) => item.installationId === installationId)) return state
    const packages = state.packages.filter((item) => item.installationId !== installationId)
    return {
      packages,
      selectedId: state.selectedId === installationId ? null : state.selectedId,
    }
  })

  export const setResourcePath = (
    installationId: string,
    resourceId: string,
    path: string,
  ) => store.update((state) => ({
    ...state,
    packages: state.packages.map((item) => item.installationId === installationId
      ? { ...item, resourcePaths: { ...item.resourcePaths, [resourceId]: path } }
      : item),
  }))

  export const find = (installationId: string): ClientPackage.Installed | null => (
    get(store).packages.find((item) => item.installationId === installationId) ?? null
  )

  export const reset = () => store.set(initialState())
}

export default ClientPackageStore
