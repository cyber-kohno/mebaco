import AppId from '../../element/kind/app/app-id'
import type AppElement from '../../element/kind/app/app-element'
import type TreeNode from '../../tree/tree-node'
import type FormulaContext from '../formula/formula-context'

namespace TransitionNamespace {
  const collectApps = (
    node: TreeNode.Node,
    result: Array<TreeNode.Node & { element: AppElement.Element }> = [],
  ): Array<TreeNode.Node & { element: AppElement.Element }> => {
    if (node.element.kind === 'app') {
      result.push(node as TreeNode.Node & { element: AppElement.Element })
    }
    node.children.forEach((child) => collectApps(child, result))
    return result
  }

  export const create = (
    projectNode: TreeNode.Node,
    requestTransition: FormulaContext.TransitionRequest,
  ): FormulaContext.TransitionValue => {
    const namespace = Object.create(null) as Record<
      string,
      (launchValues?: Readonly<Record<string, unknown>>) => void
    >

    collectApps(projectNode)
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
