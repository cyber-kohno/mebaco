import TreeNode from '@system/model/tree/tree-node'
import type ComponentReference from '@system/model/component/component-reference'
import ValueBindingReconciler from '@system/model/component/value-binding-reconciler'
import type LaunchArgument from './launch-argument'
import LaunchArgumentValueProp from './launch-argument-value-prop'

namespace LaunchArgumentBindingSync {
  type Operation =
    | { type: 'add'; argument: LaunchArgument.Element }
    | {
        type: 'update'
        previous: LaunchArgument.Element
        argument: LaunchArgument.Element
      }
    | { type: 'remove'; propId: string }

  const findOwnerAppDefinitionId = (
    rootNode: TreeNode.Node,
    argumentNodeId: number,
  ): string | null => {
    const path = TreeNode.findPath(rootNode, argumentNodeId)
    const argumentsNode = path?.at(-2)
    const launchOptionsNode = path?.at(-3)
    const appNode = path?.at(-4)
    return argumentsNode?.element.kind === 'launch-arguments'
      && launchOptionsNode?.element.kind === 'launch-options'
      && appNode?.element.kind === 'app'
      ? appNode.element.appId
      : null
  }

  const reconcile = (
    rootNode: TreeNode.Node,
    bindings: readonly ComponentReference.Binding[],
    operation: Operation,
  ): ComponentReference.Binding[] => {
    if (operation.type === 'remove') {
      return ValueBindingReconciler.remove(bindings, operation.propId)
    }
    if (operation.type === 'add') {
      return ValueBindingReconciler.add(
        rootNode,
        bindings,
        LaunchArgumentValueProp.convert(operation.argument),
      )
    }
    return ValueBindingReconciler.update(
      rootNode,
      bindings,
      LaunchArgumentValueProp.convert(operation.previous),
      LaunchArgumentValueProp.convert(operation.argument),
    )
  }

  const apply = (
    rootNode: TreeNode.Node,
    argumentNodeId: number,
    operation: Operation,
  ): number => {
    const appDefinitionId = findOwnerAppDefinitionId(rootNode, argumentNodeId)
    if (appDefinitionId == null) return 0

    let updatedCount = 0
    const visit = (node: TreeNode.Node) => {
      if (
        (node.element.kind === 'launcher' || node.element.kind === 'transition')
        && node.element.appId === appDefinitionId
      ) {
        const current = node.element.argumentBindings ?? []
        const next = reconcile(rootNode, current, operation)
        if (JSON.stringify(next) !== JSON.stringify(current)) {
          node.element = { ...node.element, argumentBindings: next }
          updatedCount += 1
        }
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return updatedCount
  }

  export const add = (
    rootNode: TreeNode.Node,
    argumentNodeId: number,
    argument: LaunchArgument.Element,
  ): number => apply(rootNode, argumentNodeId, { type: 'add', argument })

  export const update = (
    rootNode: TreeNode.Node,
    argumentNodeId: number,
    previous: LaunchArgument.Element,
    argument: LaunchArgument.Element,
  ): number => apply(rootNode, argumentNodeId, {
    type: 'update',
    previous,
    argument,
  })

  export const remove = (
    rootNode: TreeNode.Node,
    argumentNodeId: number,
    propId: string,
  ): number => apply(rootNode, argumentNodeId, { type: 'remove', propId })
}

export default LaunchArgumentBindingSync
