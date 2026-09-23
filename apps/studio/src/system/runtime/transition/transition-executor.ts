import type Transition from '@system/model/variable/transition'
import type App from '@system/model/app/app'
import type TreeNode from '@system/model/tree/tree-node'
import FormulaContext from '../formula/formula-context'
import RuntimeLaunch from '../runtime-launch'
import ScriptError from '../script/script-error'
import TransitionImportCatalog from '@system/model/app/import/transition-import-catalog'

namespace TransitionExecutor {
  export type Result =
    | { ok: true }
    | { ok: false; error: ScriptError.Value }

  const findApp = (
    node: TreeNode.Node,
    appId: string,
  ): (TreeNode.Node & { element: App.Element }) | null => {
    if (node.element.kind === 'app' && node.element.appId === appId) {
      return node as TreeNode.Node & { element: App.Element }
    }
    for (const child of node.children) {
      const found = findApp(child, appId)
      if (found != null) return found
    }
    return null
  }

  export const execute = (
    transitionNodeId: number,
    element: Transition.Element,
    context: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): Result => {
    if (element.appId == null || element.appId.length === 0) {
      return {
        ok: false,
        error: ScriptError.create('runtime', 'Transition target App is not configured.'),
      }
    }

    const ownerApp = TransitionImportCatalog.findOwnerApp(projectNode, transitionNodeId)
    if (
      ownerApp == null
      || !TransitionImportCatalog.canTransition(projectNode, ownerApp, element.appId)
    ) {
      return {
        ok: false,
        error: ScriptError.create(
          'runtime',
          `Transition target App '${element.appId}' is not imported by the current App.`,
        ),
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
      appNode as TreeNode.Node & { element: App.Element },
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
