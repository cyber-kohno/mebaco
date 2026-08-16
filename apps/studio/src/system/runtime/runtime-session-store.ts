import { writable } from 'svelte/store'
import type AppElement from '../element/kind/app/app-element'
import type TreeNode from '../tree/tree-node'

namespace RuntimeSessionStore {
  export type Session = {
    app: AppElement.Element
    appNode: TreeNode.Node
    projectNode: TreeNode.Node
  }

  export const store = writable<Session | null>(null)

  export const open = (session: Session) => {
    store.set(session)
  }

  export const close = () => {
    store.set(null)
  }
}

export default RuntimeSessionStore
