import { writable } from 'svelte/store'
import type MebacoElement from '../element/element'
import type ElementEditSchema from './element-edit-schema'

const ElementDialogStore = {}

namespace ElementDialogStore {
  export type CreateSession = {
    mode: 'create'
    parentNodeId: number
    insertIndex?: number
    schema: ElementEditSchema.Schema<MebacoElement.Element>
  }

  export type UpdateSession = {
    mode: 'update'
    nodeId: number
    element: MebacoElement.Element
    schema: ElementEditSchema.Schema<MebacoElement.Element>
  }

  export type Session = CreateSession | UpdateSession
}

export const elementDialogStore = writable<ElementDialogStore.Session | null>(null)

export default ElementDialogStore
