import type { CommandContext, CommandDefinition } from '../command-types'
import createRunCatalog, { type LaunchArgumentSpec } from '../catalog/run-catalog'
import type TreeNode from '../../tree/tree-node'
import type LauncherElement from '../../element/kind/project/launcher-element'
import type LaunchArgumentElement from '../../element/kind/app/launch/launch-argument-element'
import type AppElement from '../../element/kind/app/app-element'
import TypeExpression from '../../element/kind/type/type-expression'
import RuntimeTree from '../../runtime/runtime-tree'

const findOwnerApp = (
  node: TreeNode.Node,
  targetNodeId: number,
  ownerApp: TreeNode.Node | null = null,
): TreeNode.Node | null => {
  const currentOwnerApp = node.element.kind === 'app' ? node : ownerApp
  if (node.id === targetNodeId) return currentOwnerApp

  for (const child of node.children) {
    const found = findOwnerApp(child, targetNodeId, currentOwnerApp)
    if (found != null) return found
  }

  return null
}

const hasLaunchArguments = (appNode: TreeNode.Node): boolean => {
  const launchArgumentsNode = appNode.children
    .find((child) => child.element.kind === 'launch-options')
    ?.children.find((child) => child.element.kind === 'launch-arguments')

  return launchArgumentsNode?.children.some(
    (child) => child.element.kind === 'launch-argument',
  ) ?? false
}

const getLaunchArguments = (appNode: TreeNode.Node): TreeNode.Node[] => {
  const launchArgumentsNode = appNode.children
    .find((child) => child.element.kind === 'launch-options')
    ?.children.find((child) => child.element.kind === 'launch-arguments')
  return launchArgumentsNode?.children.filter((child) => child.element.kind === 'launch-argument') ?? []
}

const getLaunchArgumentSpecs = (appNode: TreeNode.Node): LaunchArgumentSpec[] => getLaunchArguments(appNode)
  .map((node) => node.element as LaunchArgumentElement.Element)
  .map((argument) => {
    const { base, depth } = TypeExpression.unwrapArray(argument.valueType)
    const isPrimitive = base.type === 'string' || base.type === 'number' || base.type === 'boolean'
    return {
      id: argument.id,
      kind: isPrimitive ? base.type : 'string',
      nullable: argument.nullable,
      defaultValue: argument.defaultValue?.type === 'literal'
        ? argument.defaultValue.value
        : undefined,
      defaultIsTypeDefault: argument.defaultValue?.type === 'default',
      literals: base.type === 'string' || base.type === 'number' ? base.literals : undefined,
      structured: !isPrimitive || depth > 0,
    }
  })

const hasStructuredArguments = (argumentsList: ReturnType<typeof getLaunchArgumentSpecs>): boolean => (
  argumentsList.some((argument) => (
    argument.structured
    && argument.defaultValue == null
    && argument.defaultIsTypeDefault !== true
  ))
)

const findLaunchers = (
  node: TreeNode.Node,
  appId: string,
  result: { launcherId: string; id: string; name: string }[] = [],
): { launcherId: string; id: string; name: string }[] => {
  if (
    node.element.kind === 'launcher'
    && (node.element as LauncherElement.Element).appId === appId
  ) {
    const launcher = node.element as LauncherElement.Element
    result.push({ launcherId: launcher.launcherId, id: launcher.id, name: launcher.name })
  }

  node.children.forEach((child) => findLaunchers(child, appId, result))
  return result
}

const createAppProvider = () => ({
  getCatalogs: (context: CommandContext): CommandDefinition[] => {
    const appNode = findOwnerApp(context.rootNode, context.selectedNodeId)
    if (appNode == null) return []

    const argumentsList = getLaunchArgumentSpecs(appNode)
    const runtime = RuntimeTree.createAppRuntime(appNode, context.rootNode)
    const configurationError = RuntimeTree.getEntryConfigurationError(runtime)
    return [createRunCatalog({
      hasLaunchArguments: hasLaunchArguments(appNode),
      hasStructuredArguments: hasStructuredArguments(argumentsList),
      arguments: argumentsList,
      configurationError: configurationError ?? undefined,
      launchers: configurationError == null
          ? findLaunchers(
            context.rootNode,
            (appNode.element as AppElement.Element).appId,
          )
        : [],
    })]
  },
})

export default createAppProvider
