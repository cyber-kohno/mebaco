import { writable } from 'svelte/store'
import type App from '@system/model/app/app'
import type TreeNode from '@system/model/tree/tree-node'
import type ResourceRuntime from './resource/resource-runtime'
import type RuntimeLog from './log/runtime-log'
import type StorageRuntime from './storage/storage-runtime'
import type RuntimePreviewProbe from './preview/runtime-preview-probe'

namespace RuntimeSessionStore {
  export type Session = {
    app: App.Element
    appNode: TreeNode.Node
    projectNode: TreeNode.Node
    resourceSession: ResourceRuntime.Session
    logSession: RuntimeLog.Session
    storageSession: StorageRuntime.Session
    launcherId?: string
    launchValues?: Readonly<Record<string, unknown>>
    inspection?: RuntimePreviewProbe.Session
  }

  export const store = writable<Session | null>(null)

  export const open = (session: Session) => {
    store.update((current) => {
      if (current?.inspection !== session.inspection) current?.inspection?.dispose()
      if (current != null && current.resourceSession !== session.resourceSession) {
        current.resourceSession.dispose()
      }
      return session
    })
  }

  export const close = () => {
    store.update((session) => {
      session?.inspection?.dispose()
      session?.resourceSession.dispose()
      return null
    })
  }
}

export default RuntimeSessionStore
