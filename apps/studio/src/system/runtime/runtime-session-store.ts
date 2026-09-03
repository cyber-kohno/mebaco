import { writable } from 'svelte/store'
import type AppElement from '../element/kind/app/app-element'
import type TreeNode from '../tree/tree-node'
import type ResourceRuntime from './resource/resource-runtime'
import type RuntimeLog from './log/runtime-log'

namespace RuntimeSessionStore {
  export type Session = {
    app: AppElement.Element
    appNode: TreeNode.Node
    projectNode: TreeNode.Node
    resourceSession: ResourceRuntime.Session
    logSession: RuntimeLog.Session
    launcherId?: string
    launchValues?: Readonly<Record<string, unknown>>
  }

  export const store = writable<Session | null>(null)

  export const open = (session: Session) => {
    store.update((current) => {
      if (current != null && current.resourceSession !== session.resourceSession) {
        current.resourceSession.dispose()
      }
      return session
    })
  }

  export const close = () => {
    store.update((session) => {
      session?.resourceSession.dispose()
      return null
    })
  }
}

export default RuntimeSessionStore
