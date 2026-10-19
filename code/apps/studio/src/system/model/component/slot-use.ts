import ComponentReference from '@system/model/component/component-reference'
import type Slot from '@system/model/component/slot'
import type ValueProp from '@system/model/component/value-prop'
import type TreeNode from '@system/model/tree/tree-node'

namespace SlotUse {
  export type Kind = 'slot-use'
  export type Element = {
    kind: Kind
    slotId: string
    propBindings: ComponentReference.Binding[]
  }

  export type Option = ComponentReference.Option & { value: string }

  export const create = (slotId = ''): Element => ({
    kind: 'slot-use',
    slotId,
    propBindings: [],
  })

  export const getOptions = (
    rootNode: TreeNode.Node,
    nodeId: number,
  ): Option[] => {
    const path: TreeNode.Node[] = []
    const walk = (node: TreeNode.Node): boolean => {
      path.push(node)
      if (node.id === nodeId) return true
      for (const child of node.children) {
        if (walk(child)) return true
      }
      path.pop()
      return false
    }
    if (!walk(rootNode)) return []
    const component = [...path].reverse().find(
      (node) => node.element.kind === 'component',
    )
    const slots = component?.children.find(
      (child) => child.element.kind === 'slots',
    )
    return slots?.children
      .filter((node): node is TreeNode.Node & { element: Slot.Element } => (
        node.element.kind === 'slot'
      ))
      .map((node) => ({
        componentId: node.element.slotId,
        value: node.element.slotId,
        label: node.element.id,
        props: node.children
          .find((child) => child.element.kind === 'props')?.children
          .map((child) => child.element)
          .filter((element): element is ValueProp.Element => (
            element.kind === 'value-prop'
          )) ?? [],
      })) ?? []
  }
}

export default SlotUse
