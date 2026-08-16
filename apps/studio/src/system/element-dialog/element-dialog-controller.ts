import type MebacoElement from '../element/element'
import type ElementEditSchema from './element-edit-schema'
import { elementDialogStore } from './element-dialog-store'

namespace ElementDialog {
  export const openCreate = (
    parentNodeId: number,
    schema: ElementEditSchema.Schema<MebacoElement.Element>,
    insertIndex?: number,
  ) => {
    elementDialogStore.set({
      mode: 'create',
      parentNodeId,
      insertIndex,
      schema,
    })
  }

  export const openUpdate = (
    nodeId: number,
    element: MebacoElement.Element,
    schema: ElementEditSchema.Schema<MebacoElement.Element>,
  ) => {
    elementDialogStore.set({
      mode: 'update',
      nodeId,
      element,
      schema,
    })
  }

  export const close = () => {
    elementDialogStore.set(null)
  }
}

export default ElementDialog
