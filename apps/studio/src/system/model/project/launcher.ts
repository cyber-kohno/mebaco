import type TreeNode from '@system/model/tree/tree-node'
import ComponentReference from '@system/model/component/component-reference'
import type LaunchArgument from '@system/model/app/launch-argument'
import LaunchArgumentValueProp from '@system/model/app/launch-argument-value-prop'

namespace Launcher {
  export type Kind = 'launcher'
  export type Element = {
    kind: Kind
    launcherId: string
    id: string
    name?: string
    appId: string | null
    argumentBindings: ComponentReference.Binding[]
  }

  export const create = (
    launcherId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'launcher',
    launcherId,
    id: '...',
    appId: null,
    argumentBindings: [],
  })

  const collectApps = (node: TreeNode.Node): TreeNode.Node[] => [
    ...(node.element.kind === 'app' ? [node] : []),
    ...node.children.flatMap(collectApps),
  ]

  export const getAppOption = (node: TreeNode.Node): ComponentReference.Option | null => {
    if (node.element.kind !== 'app') return null
    const argsNode = node.children
      .find((child) => child.element.kind === 'launch-options')
      ?.children.find((child) => child.element.kind === 'launch-arguments')
    const props = (argsNode?.children ?? [])
      .filter((child): child is TreeNode.Node & { element: LaunchArgument.Element } => (
        child.element.kind === 'launch-argument'
      ))
      .map((child) => LaunchArgumentValueProp.convert(child.element))
    return { componentId: node.element.appId, label: node.element.id, props }
  }

  export const getAppOptions = (rootNode: TreeNode.Node): ComponentReference.Option[] => (
    collectApps(rootNode)
      .map(getAppOption)
      .filter((option): option is ComponentReference.Option => option != null)
  )
}

export default Launcher
