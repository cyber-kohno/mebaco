import { translate } from '@system/application/localization'
import type { TreeTransferValidator } from '@system/workspace/tree/transfer/validator'

namespace TreeDestinationWarningPresentation {
  export const createMessage = (
    warning: TreeTransferValidator.MoveWarning,
  ): string => {
    switch (warning.type) {
      case 'reference-target-changed':
        return translate(
          'workspace.treeDestination.warning.referenceTargetChanged',
          { nodeId: warning.nodeId, sourceLabel: warning.sourceLabel },
        )
      case 'expression-node-unavailable':
        return translate(
          'workspace.treeDestination.warning.nodeUnavailable',
          { nodeId: warning.nodeId },
        )
      case 'expression-invalid':
        return translate(
          'workspace.treeDestination.warning.expressionInvalid',
          { nodeId: warning.nodeId, details: warning.details.join(' ') },
        )
    }
  }
}

export default TreeDestinationWarningPresentation
