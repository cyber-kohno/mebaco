import type MebacoElement from '../../../element/element'

namespace DevelopInteractionMode {
  export type Normal = {
    type: 'normal'
  }

  export type DestinationOperation =
    | {
        type: 'copy'
        sourceKind: MebacoElement.Kind
      }
    | {
        type: 'move'
        sourceKind: MebacoElement.Kind
      }
    | {
        type: 'extract-signature'
      }

  export type DestinationTransaction = {
    type: 'destination-transaction'
    operation: DestinationOperation
    phase: 'select-destination' | 'confirm'
    sourceNodeId: number
    sourceLabel: string
    originViewRootNodeId: number | null
    destinationNodeId?: number
  }

  export type Value = Normal | DestinationTransaction

  export const normal = (): Normal => ({ type: 'normal' })
}

export default DevelopInteractionMode
