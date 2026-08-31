import AppId from '../../element/kind/app/app-id'
import type AppElement from '../../element/kind/app/app-element'
import type TreeNode from '../../tree/tree-node'
import type FormulaContext from '../formula/formula-context'
import TransitionImportCatalog from '../../element/kind/app/import/transition-import-catalog'

namespace TransitionNamespace {
  export const create = (
    projectNode: TreeNode.Node,
    appNode: TreeNode.Node,
    requestTransition: FormulaContext.TransitionRequest,
  ): FormulaContext.TransitionValue => {
    const namespace = Object.create(null) as Record<
      string,
      (launchValues?: Readonly<Record<string, unknown>>) => void
    >

    TransitionImportCatalog.getImportedApps(projectNode, appNode)
      .forEach((appNode) => {
        const accessor = AppId.toTransitionAccessor(appNode.element.id)
        if (Object.hasOwn(namespace, accessor)) {
          throw new Error(`Duplicate transition accessor '${accessor}'.`)
        }
        namespace[accessor] = (launchValues = {}) => {
          requestTransition(appNode.element.appId, launchValues)
        }
      })

    return Object.freeze(namespace)
  }
}

export default TransitionNamespace
