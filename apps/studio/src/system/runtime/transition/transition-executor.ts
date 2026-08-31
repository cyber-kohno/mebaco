import type TransitionElement from '../../element/kind/variable/transition-element'
import type AppElement from '../../element/kind/app/app-element'
import type TreeNode from '../../tree/tree-node'
import FormulaContext from '../formula/formula-context'
import RuntimeLaunch from '../runtime-launch'
import ScriptError from '../script/script-error'

namespace TransitionExecutor {
  export type Result =
    | { ok: true }
    | { ok: false; error: ScriptError.Value }

  const findApp = (
    node: TreeNode.Node,
    appId: string,
  ): (TreeNode.Node & { element: AppElement.Element }) | null => {
    if (node.element.kind === 'app' && node.element.appId === appId) {
      return node as TreeNode.Node & { element: AppElement.Element }
    }
    for (const child of node.children) {
      const found = findApp(child, appId)
      if (found != null) return found
    }
    return null
  }

  export const execute = (
    element: TransitionElement.Element,
    context: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): Result => {
    if (element.appId == null || element.appId.length === 0) {
      return {
        ok: false,
        error: ScriptError.create('runtime', 'Transition target App is not configured.'),
      }
    }

    const appNode = findApp(projectNode, element.appId)
    if (appNode == null) {
      return {
        ok: false,
        error: ScriptError.create(
          'runtime',
          `Transition target App '${element.appId}' was not found.`,
        ),
      }
    }

    const resolved = RuntimeLaunch.resolveBindings(
      appNode as TreeNode.Node & { element: AppElement.Element },
      element.argumentBindings,
      context,
      projectNode,
    )
    if (resolved.errors.length > 0) {
      return {
        ok: false,
        error: ScriptError.create('runtime', resolved.errors[0]),
      }
    }

    try {
      context.requestTransition(appNode.element.appId, resolved.values)
    } catch (error) {
      return {
        ok: false,
        error: ScriptError.fromUnknown('runtime', error),
      }
    }
    return { ok: true }
  }
}

export default TransitionExecutor
