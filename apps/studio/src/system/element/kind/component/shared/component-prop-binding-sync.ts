import TreeNode from '../../../../tree/tree-node'
import type ValuePropElement from '../definition/value-prop-element'
import type ComponentReference from './component-reference'
import ValueBindingReconciler from '../../shared/value-binding-reconciler'

namespace ComponentPropBindingSync {
  type Owner =
    | { type: 'component'; id: string }
    | { type: 'slot'; id: string }

  type Operation =
    | { type: 'add'; prop: ValuePropElement.Element }
    | {
        type: 'update'
        previous: ValuePropElement.Element
        prop: ValuePropElement.Element
      }
    | { type: 'remove'; propId: string }

  const findOwner = (
    rootNode: TreeNode.Node,
    propNodeId: number,
  ): Owner | null => {
    const path = TreeNode.findPath(rootNode, propNodeId)
    const propsNode = path?.at(-2)
    const ownerNode = path?.at(-3)
    if (propsNode?.element.kind !== 'props' || ownerNode == null) return null
    if (ownerNode.element.kind === 'component') {
      return { type: 'component', id: ownerNode.element.componentId }
    }
    if (ownerNode.element.kind === 'slot') {
      return { type: 'slot', id: ownerNode.element.slotId }
    }
    return null
  }

  const reconcileBindings = (
    rootNode: TreeNode.Node,
    bindings: readonly ComponentReference.Binding[],
    operation: Operation,
  ): ComponentReference.Binding[] => {
    if (operation.type === 'remove') {
      return ValueBindingReconciler.remove(bindings, operation.propId)
    }
    if (operation.type === 'add') {
      return ValueBindingReconciler.add(rootNode, bindings, operation.prop)
    }
    return ValueBindingReconciler.update(
      rootNode,
      bindings,
      operation.previous,
      operation.prop,
    )
  }

  const matchesOwner = (
    node: TreeNode.Node,
    owner: Owner,
  ): boolean => {
    if (owner.type === 'component') {
      return (
        node.element.kind === 'entry' || node.element.kind === 'component-use'
      ) && node.element.componentId === owner.id
    }
    return node.element.kind === 'slot-use' && node.element.slotId === owner.id
  }

  const apply = (
    rootNode: TreeNode.Node,
    propNodeId: number,
    operation: Operation,
  ): number => {
    const owner = findOwner(rootNode, propNodeId)
    if (owner == null) return 0

    let updatedCount = 0
    const visit = (node: TreeNode.Node) => {
      if (matchesOwner(node, owner)) {
        const element = node.element
        if (
          element.kind === 'entry'
          || element.kind === 'component-use'
          || element.kind === 'slot-use'
        ) {
          const current = element.propBindings ?? []
          const next = reconcileBindings(rootNode, current, operation)
          if (JSON.stringify(next) !== JSON.stringify(current)) {
            node.element = { ...element, propBindings: next }
            updatedCount += 1
          }
        }
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return updatedCount
  }

  export const add = (
    rootNode: TreeNode.Node,
    propNodeId: number,
    prop: ValuePropElement.Element,
  ): number => apply(rootNode, propNodeId, { type: 'add', prop })

  export const update = (
    rootNode: TreeNode.Node,
    propNodeId: number,
    previous: ValuePropElement.Element,
    prop: ValuePropElement.Element,
  ): number => apply(rootNode, propNodeId, { type: 'update', previous, prop })

  export const remove = (
    rootNode: TreeNode.Node,
    propNodeId: number,
    propId: string,
  ): number => apply(rootNode, propNodeId, { type: 'remove', propId })
}

export default ComponentPropBindingSync
