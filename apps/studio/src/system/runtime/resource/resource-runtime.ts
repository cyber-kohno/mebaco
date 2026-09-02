import { invoke } from '@tauri-apps/api/core'
import type TreeNode from '../../tree/tree-node'
import type DirectoryResourceElement from '../../element/kind/resource/directory-resource-element'
import type TextResourceElement from '../../element/kind/resource/text-resource-element'
import type SqliteResourceElement from '../../element/kind/resource/sqlite-resource-element'

namespace ResourceRuntime {
  export type Backend = {
    invoke: <T>(command: string, args: { request: unknown }) => Promise<T>
  }

  export type DirectoryEntry = {
    name: string
    relativePath: string
    kind: 'file' | 'directory'
  }

  export type Session = {
    id: string
    namespace: Readonly<Record<string, unknown>>
    attachRequestRender: (requestRender: () => void) => () => void
    dispose: () => void
  }

  type ResourceElement =
    | DirectoryResourceElement.Element
    | TextResourceElement.Element
    | SqliteResourceElement.Element

  type Policy = {
    access: 'read' | 'read-write'
    pattern: string
    create?: boolean
  }

  type Registration = {
    resourceId: string
    kind: 'directory' | 'text' | 'sqlite'
    path: string
    access: 'read' | 'read-write'
    deleteFile?: boolean
    text?: Policy
    sqlite?: Policy
    create?: boolean
  }

  const tauriBackend: Backend = {
    invoke: (command, args) => invoke(command, args),
  }

  const collect = <T>(
    rootNode: TreeNode.Node,
    accept: (node: TreeNode.Node) => T | null,
  ): T[] => {
    const result: T[] = []
    const visit = (node: TreeNode.Node) => {
      const value = accept(node)
      if (value != null) result.push(value)
      node.children.forEach(visit)
    }
    visit(rootNode)
    return result
  }

  const collectResources = (
    rootNode: TreeNode.Node,
  ): ResourceElement[] => collect(rootNode, (node) => (
    node.element.kind === 'directory-resource'
    || node.element.kind === 'text-resource'
    || node.element.kind === 'sqlite-resource'
      ? node.element
      : null
  ))

  const getFirstBindings = (
    rootNode: TreeNode.Node,
  ): ReadonlyMap<string, string> => {
    const configurations = collect(rootNode, (node) => (
      node.element.kind === 'debug-configurations' ? node : null
    ))[0]
    const firstConfiguration = configurations?.children.find(
      (child) => child.element.kind === 'debug-configuration',
    )
    const bindings = firstConfiguration?.children.find(
      (child) => child.element.kind === 'debug-resource-bindings',
    )
    return new Map(bindings?.element.kind === 'debug-resource-bindings'
      ? bindings.element.bindings.map((binding) => [binding.resourceId, binding.path])
      : [])
  }

  const createRegistrations = (
    rootNode: TreeNode.Node,
    resources: readonly ResourceElement[],
  ): Registration[] => {
    const pathByResourceId = getFirstBindings(rootNode)
    return resources.map((resource): Registration => {
      const base = {
        resourceId: resource.resourceId,
        path: pathByResourceId.get(resource.resourceId) ?? '',
      }
      switch (resource.kind) {
        case 'directory-resource':
          return {
            ...base,
            kind: 'directory',
            access: resource.permissions.access,
            deleteFile: resource.permissions.deleteFile,
            ...(resource.permissions.text == null ? {} : { text: resource.permissions.text }),
            ...(resource.permissions.sqlite == null ? {} : { sqlite: resource.permissions.sqlite }),
          }
        case 'text-resource':
          return { ...base, kind: 'text', access: resource.access }
        case 'sqlite-resource':
          return {
            ...base,
            kind: 'sqlite',
            access: resource.access,
            create: resource.access === 'read-write' && resource.create,
          }
      }
    })
  }

  const normalizeRelativePath = (
    value: string,
  ): string => {
    if (value.length === 0 || value.length > 1024 || value.includes('\0')) {
      throw new Error('A non-empty relative path is required.')
    }
    const normalized = value.replaceAll('\\', '/')
    if (
      normalized.startsWith('/')
      || /^[a-zA-Z]:/.test(normalized)
      || normalized.split('/').some((part) => part.length === 0 || part === '.' || part === '..')
    ) {
      throw new Error(`Invalid relative Resource path '${value}'.`)
    }
    return normalized
  }

  const globToRegExp = (
    pattern: string,
  ): RegExp => {
    let source = '^'
    for (let index = 0; index < pattern.length; index += 1) {
      const character = pattern[index]
      if (character === '*' && pattern[index + 1] === '*') {
        index += 1
        if (pattern[index + 1] === '/') {
          index += 1
          source += '(?:.*/)?'
        } else {
          source += '.*'
        }
      } else if (character === '*') {
        source += '[^/]*'
      } else if (character === '?') {
        source += '[^/]'
      } else {
        source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
      }
    }
    return new RegExp(`${source}$`)
  }

  const validateDerivedPath = (
    value: string,
    pattern: string,
  ): string => {
    const relativePath = normalizeRelativePath(value)
    let matches: boolean
    try {
      matches = globToRegExp(pattern.replaceAll('\\', '/')).test(relativePath)
    } catch {
      throw new Error(`Invalid Resource path pattern '${pattern}'.`)
    }
    if (!matches) {
      throw new Error(`Resource path '${value}' is not allowed by pattern '${pattern}'.`)
    }
    return relativePath
  }

  const normalizeGlobPattern = (
    value: string,
  ): string => {
    if (value.length === 0 || value.length > 1024 || value.includes('\0')) {
      throw new Error('A non-empty Resource glob pattern is required.')
    }
    if (
      value.includes('\\')
      || value.startsWith('/')
      || /^[a-zA-Z]:/.test(value)
      || value.split('/').some((part) => part.length === 0 || part === '.' || part === '..')
    ) {
      throw new Error(`Invalid Resource glob pattern '${value}'.`)
    }
    return value
  }

  export const create = (
    rootNode: TreeNode.Node,
    backend: Backend = tauriBackend,
  ): Session => {
    const id = crypto.randomUUID()
    const resources = collectResources(rootNode)
    const registrations = createRegistrations(rootNode, resources)
    let registration: Promise<void> | null = null
    let registered = false
    let disposed = false
    const requestRenders = new Set<() => void>()

    const ensureRegistered = (): Promise<void> => {
      if (disposed) return Promise.reject(new Error('The Resource session is closed.'))
      registration ??= backend.invoke<void>('resource_create_session', {
        request: { sessionId: id, resources: registrations },
      }).then(() => { registered = true })
      return registration
    }

    const execute = <T>(
      command: string,
      request: Record<string, unknown>,
    ): Promise<T> => {
      const operation = ensureRegistered().then(() => {
        if (disposed) throw new Error('The Resource session is closed.')
        return backend.invoke<T>(command, {
          request: { sessionId: id, ...request },
        })
      })
      void operation.then(
        () => globalThis.setTimeout(() => requestRenders.forEach((render) => render()), 0),
        () => globalThis.setTimeout(() => requestRenders.forEach((render) => render()), 0),
      )
      return operation
    }

    const target = (
      resourceId: string,
      relativePath?: string,
    ): Record<string, unknown> => ({
      resourceId,
      ...(relativePath == null ? {} : { relativePath }),
    })

    const createText = (
      resourceId: string,
      access: 'read' | 'read-write',
      relativePath?: string,
    ): Readonly<Record<string, unknown>> => {
      const validateEncoding = (encoding: string) => {
        if (encoding !== 'utf8') throw new Error(`Unsupported Text Resource encoding '${encoding}'.`)
      }
      return Object.freeze({
        read: (encoding: 'utf8' = 'utf8') => {
          validateEncoding(encoding)
          return execute<string>('resource_read_text', {
            ...target(resourceId, relativePath),
          })
        },
        ...(access === 'read-write' ? {
          write: (text: string, encoding: 'utf8' = 'utf8') => {
            validateEncoding(encoding)
            return execute<void>('resource_write_text', {
              ...target(resourceId, relativePath),
              text,
            })
          },
        } : {}),
      })
    }

    const createSqlite = (
      resourceId: string,
      relativePath?: string,
    ): Readonly<Record<string, unknown>> => Object.freeze({
      open: () => execute<Record<string, never>>('resource_open_sqlite', {
        ...target(resourceId, relativePath),
      }),
    })

    const createDirectory = (
      resource: DirectoryResourceElement.Element,
    ): Readonly<Record<string, unknown>> => Object.freeze({
      exists: (relativePath: string) => execute<boolean>('resource_exists', {
        ...target(resource.resourceId),
        relativePath: normalizeRelativePath(relativePath),
      }),
      list: (relativePath?: string) => execute<DirectoryEntry[]>('resource_list', {
        ...target(resource.resourceId),
        ...(relativePath == null || relativePath.length === 0
          ? {}
          : { relativePath: normalizeRelativePath(relativePath) }),
      }),
      glob: (pattern: string) => execute<DirectoryEntry[]>('resource_glob', {
        ...target(resource.resourceId),
        pattern: normalizeGlobPattern(pattern),
      }),
      ...(resource.permissions.access === 'read-write' ? {
        renameFile: (sourceRelativePath: string, destinationRelativePath: string) => execute<void>('resource_rename_file', {
          ...target(resource.resourceId),
          sourceRelativePath: normalizeRelativePath(sourceRelativePath),
          destinationRelativePath: normalizeRelativePath(destinationRelativePath),
        }),
        copyFile: (sourceRelativePath: string, destinationRelativePath: string) => execute<void>('resource_copy_file', {
          ...target(resource.resourceId),
          sourceRelativePath: normalizeRelativePath(sourceRelativePath),
          destinationRelativePath: normalizeRelativePath(destinationRelativePath),
        }),
        createDir: (relativePath: string) => execute<void>('resource_create_dir', {
          ...target(resource.resourceId),
          relativePath: normalizeRelativePath(relativePath),
        }),
        createFile: (relativePath: string) => execute<void>('resource_create_file', {
          ...target(resource.resourceId),
          relativePath: normalizeRelativePath(relativePath),
        }),
      } : {}),
      ...(resource.permissions.access === 'read-write' && resource.permissions.deleteFile ? {
        deleteFile: (relativePath: string) => execute<void>('resource_delete_file', {
          ...target(resource.resourceId),
          relativePath: normalizeRelativePath(relativePath),
        }),
      } : {}),
      ...(resource.permissions.text == null ? {} : {
        text: (relativePath: string) => createText(
          resource.resourceId,
          resource.permissions.text!.access,
          validateDerivedPath(relativePath, resource.permissions.text!.pattern),
        ),
      }),
      ...(resource.permissions.sqlite == null ? {} : {
        sqlite: (relativePath: string) => createSqlite(
          resource.resourceId,
          validateDerivedPath(relativePath, resource.permissions.sqlite!.pattern),
        ),
      }),
    })

    const namespace: Record<string, unknown> = Object.create(null)
    resources.forEach((resource) => {
      switch (resource.kind) {
        case 'directory-resource':
          namespace[resource.id] = createDirectory(resource)
          break
        case 'text-resource':
          namespace[resource.id] = createText(resource.resourceId, resource.access)
          break
        case 'sqlite-resource':
          namespace[resource.id] = createSqlite(resource.resourceId)
          break
      }
    })
    Object.freeze(namespace)

    return {
      id,
      namespace,
      attachRequestRender: (requestRender) => {
        requestRenders.add(requestRender)
        return () => requestRenders.delete(requestRender)
      },
      dispose: () => {
        if (disposed) return
        disposed = true
        requestRenders.clear()
        if (registered) {
          void backend.invoke<void>('resource_dispose_session', {
            request: { sessionId: id },
          })
        } else if (registration != null) {
          void registration.then(() => backend.invoke<void>('resource_dispose_session', {
            request: { sessionId: id },
          }), () => undefined)
        }
      },
    }
  }
}

export default ResourceRuntime
