import type ResourceImportCatalog from '../../element/kind/app/import/resource-import-catalog'
import TauriResourcePathValidation from '../../infra/tauri/resource-path-validation'

namespace ClientResourcePathValidator {
  export const DEBOUNCE_MS = 400

  export type Status =
    | 'not-specified'
    | 'checking'
    | TauriResourcePathValidation.Status

  export type State = {
    path: string
    status: Status
    detail?: string
  }

  export type Backend = (
    request: TauriResourcePathValidation.Request,
  ) => Promise<TauriResourcePathValidation.Result>

  export type Controller = {
    schedule: (resource: ResourceImportCatalog.ResourceElement, path: string) => void
    checkNow: (
      resource: ResourceImportCatalog.ResourceElement,
      path: string,
    ) => Promise<State | null>
    cancelAll: () => void
    dispose: () => void
  }

  export const createRequest = (
    resource: ResourceImportCatalog.ResourceElement,
    path: string,
  ): TauriResourcePathValidation.Request => ({
    path,
    expectedKind: resource.kind === 'directory-resource' ? 'directory' : 'file',
    allowMissingFile: resource.kind === 'sqlite-resource'
      && resource.access === 'read-write'
      && resource.create,
  })

  export const isAccepted = (state: State | undefined): boolean => (
    state?.status === 'valid' || state?.status === 'creatable'
  )

  export const getMessage = (
    state: State,
    resource: ResourceImportCatalog.ResourceElement,
  ): string => {
    switch (state.status) {
      case 'not-specified': return 'Not specified'
      case 'checking': return 'Checking…'
      case 'valid': return resource.kind === 'directory-resource'
        ? 'Valid folder path'
        : 'Valid file path'
      case 'creatable': return 'File will be created when launched'
      case 'not-absolute': return 'An absolute path is required.'
      case 'not-found': return 'Path does not exist.'
      case 'expected-file': return 'A file is required; this path is a folder.'
      case 'expected-directory': return 'A folder is required; this path is a file.'
      case 'parent-not-directory': return 'The parent path is not a folder.'
      case 'unsupported-kind': return 'This path is not a regular file or folder.'
      case 'unavailable': return 'The path cannot be accessed.'
    }
  }

  export const create = (
    onUpdate: (resourceId: string, state: State) => void,
    backend: Backend = TauriResourcePathValidation.validate,
  ): Controller => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const generations = new Map<string, number>()
    let disposed = false

    const invalidate = (resourceId: string): number => {
      const timer = timers.get(resourceId)
      if (timer != null) clearTimeout(timer)
      timers.delete(resourceId)
      const generation = (generations.get(resourceId) ?? 0) + 1
      generations.set(resourceId, generation)
      return generation
    }

    const publish = (resourceId: string, state: State) => {
      if (!disposed) onUpdate(resourceId, state)
    }

    const run = async (
      resource: ResourceImportCatalog.ResourceElement,
      path: string,
      generation: number,
    ): Promise<State | null> => {
      let state: State
      try {
        const result = await backend(createRequest(resource, path))
        state = { path, status: result.status, ...(result.detail == null ? {} : { detail: result.detail }) }
      } catch (error) {
        state = {
          path,
          status: 'unavailable',
          detail: error instanceof Error ? error.message : String(error),
        }
      }
      if (disposed || generations.get(resource.resourceId) !== generation) return null
      publish(resource.resourceId, state)
      return state
    }

    const prepare = (
      resource: ResourceImportCatalog.ResourceElement,
      path: string,
    ): { generation: number; immediate: State | null } => {
      const generation = invalidate(resource.resourceId)
      if (path.trim().length === 0) {
        const immediate: State = { path, status: 'not-specified' }
        publish(resource.resourceId, immediate)
        return { generation, immediate }
      }
      publish(resource.resourceId, { path, status: 'checking' })
      return { generation, immediate: null }
    }

    const checkNow = async (
      resource: ResourceImportCatalog.ResourceElement,
      path: string,
    ): Promise<State | null> => {
      const prepared = prepare(resource, path)
      if (prepared.immediate != null) return prepared.immediate
      return run(resource, path, prepared.generation)
    }

    const schedule = (
      resource: ResourceImportCatalog.ResourceElement,
      path: string,
    ) => {
      const prepared = prepare(resource, path)
      if (prepared.immediate != null) return
      const timer = setTimeout(() => {
        timers.delete(resource.resourceId)
        void run(resource, path, prepared.generation)
      }, DEBOUNCE_MS)
      timers.set(resource.resourceId, timer)
    }

    const cancelAll = () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      generations.forEach((generation, resourceId) => {
        generations.set(resourceId, generation + 1)
      })
    }

    return {
      schedule,
      checkNow,
      cancelAll,
      dispose: () => {
        cancelAll()
        disposed = true
      },
    }
  }
}

export default ClientResourcePathValidator
