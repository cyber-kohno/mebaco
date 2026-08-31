import ActionMenu from '../../../action-menu/action-menu-controller'
import ReferenceGraphController from '../../../analysis/reference/reference-graph-controller'
import TreeStore from '../../../store/tree-store'
import TreeNode from '../../../tree/tree-node'
import TreeViewportController from '../../../tree/tree-viewport-controller'
import DevelopInteractionMode from './develop-interaction-mode'
import { developInteractionStore } from './develop-interaction-store'
import { get } from 'svelte/store'

namespace DevelopInteractionController {
  export const connectTreeLifecycle = (): (() => void) => TreeStore.onLifecycle(() => {
    cancel(false)
  })

  export const cancel = (restoreViewport = true) => {
    ActionMenu.close()
    const mode = get(developInteractionStore)
    developInteractionStore.set(DevelopInteractionMode.normal())
    if (!restoreViewport || mode.type !== 'tree-transfer') return

    const rootNode = get(TreeStore.rootNode)
    if (TreeNode.findNode(rootNode, mode.sourceNodeId) == null) return
    const originViewRootNodeId = mode.originViewRootNodeId
    if (
      originViewRootNodeId != null
      && !TreeNode.isDescendantOrSelf(rootNode, originViewRootNodeId, mode.sourceNodeId)
    ) return
    TreeViewportController.setViewRootNodeId(rootNode, originViewRootNodeId)
    TreeStore.selectedNodeId.set(mode.sourceNodeId)
    TreeViewportController.requestReveal(mode.sourceNodeId)
  }

  export const beginTreeTransfer = (
    session: Omit<
      DevelopInteractionMode.TreeTransfer,
      'type' | 'phase' | 'originViewRootNodeId'
    >,
  ) => {
    ReferenceGraphController.close()
    const rootNode = get(TreeStore.rootNode)
    const originViewRootNodeId = get(TreeViewportController.state).viewRootNodeId
    TreeViewportController.setViewRootNodeId(rootNode, null)
    TreeViewportController.requestReveal(session.sourceNodeId)
    developInteractionStore.set({
      type: 'tree-transfer',
      phase: 'select-destination',
      originViewRootNodeId,
      ...session,
    })
  }
}

export default DevelopInteractionController
