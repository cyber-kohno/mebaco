import { invoke } from '@tauri-apps/api/core'
import type TreeNode from '../../tree/tree-node'
import type StorageItemElement from '../../element/kind/storage/storage-item-element'
import StorageImportCatalog from '../../element/kind/app/import/storage-import-catalog'
import RuntimeState from '../runtime-state'

namespace StorageRuntime {
  export type Scope = { kind: 'development' | 'package'; id: string }
  export type Backend = { invoke: typeof invoke }
  export type Item = { get(): Promise<unknown>; set(value: unknown): Promise<void> }
  export type Namespace = Readonly<{
    keyValue: Readonly<Record<string, Item>>
  }>

  const defaultBackend: Backend = { invoke }
  const jsonValue = (value: unknown): unknown => {
    const source = JSON.stringify(value, (_key, candidate) => {
      if (candidate === undefined || typeof candidate === 'bigint' || typeof candidate === 'function' || typeof candidate === 'symbol') {
        throw new TypeError('Storage values must be JSON-compatible.')
      }
      if (typeof candidate === 'number' && !Number.isFinite(candidate)) {
        throw new TypeError('Storage numbers must be finite.')
      }
      return candidate
    })
    if (source == null) throw new TypeError('Storage values must be JSON-compatible.')
    return JSON.parse(source) as unknown
  }

  const collectItems = (node: TreeNode.Node, result: StorageItemElement.Element[] = []): StorageItemElement.Element[] => {
    if (node.element.kind === 'key-value') result.push(node.element)
    node.children.forEach((child) => collectItems(child, result))
    return result
  }

  export class Session {
    constructor(
      private readonly rootNode: TreeNode.Node,
      private readonly scope: Scope,
      private readonly backend: Backend = defaultBackend,
    ) {}

    getNamespace(appNode: TreeNode.Node): Namespace {
      const imported = new Set(StorageImportCatalog.getIds(appNode))
      const namespace: Record<string, Item> = Object.create(null) as Record<string, Item>
      collectItems(this.rootNode).filter((item) => imported.has(item.storageId)).forEach((item) => {
        const initial = jsonValue(RuntimeState.createPersistentInitialValue(
          { ...item, kind: 'state' },
          this.rootNode,
        ))
        namespace[item.id] = Object.freeze({
          get: async () => this.backend.invoke('storage_get', {
            request: { scope: this.scope, storageId: item.storageId, initial },
          }),
          set: async (value: unknown) => {
            await this.backend.invoke('storage_set', {
              request: { scope: this.scope, storageId: item.storageId, value: jsonValue(value) },
            })
          },
        })
      })
      return Object.freeze({ keyValue: Object.freeze(namespace) })
    }
  }

  export const developmentScope = (rootNode: TreeNode.Node): Scope => ({
    kind: 'development',
    id: rootNode.element.kind === 'project' && rootNode.element.projectId != null
      ? rootNode.element.projectId
      : 'legacy-project',
  })
}

export default StorageRuntime
