import type MebacoElement from '../../../element/element'

namespace DevelopInteractionMode {
  export type Normal = {
    type: 'normal'
  }

  export type TreeTransfer = {
    type: 'tree-transfer'
    operation: 'copy' | 'move'
    phase: 'select-destination' | 'confirm'
    sourceNodeId: number
    sourceKind: MebacoElement.Kind
    sourceLabel: string
    originViewRootNodeId: number | null
    destinationNodeId?: number
  }

  export type Value = Normal | TreeTransfer

  export const normal = (): Normal => ({ type: 'normal' })
}

export default DevelopInteractionMode
