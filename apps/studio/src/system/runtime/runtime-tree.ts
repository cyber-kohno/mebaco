import type AppElement from '../element/kind/app/app-element'
import type ComponentElement from '../element/kind/component/component-element'
import type ComponentUseElement from '../element/kind/component/component-use-element'
import type SlotUseElement from '../element/kind/component/slot-use-element'
import type EntryElement from '../element/kind/app/entry-element'
import type StateElement from '../element/kind/variable/store/state-element'
import type StyleElement from '../element/kind/view/style-element'
import type TagElement from '../element/kind/view/tag-element'
import type TextElement from '../element/kind/view/text-element'
import type ConditionalElement from '../element/kind/directive/conditional-element'
import type SwitchElement from '../element/kind/directive/switch-element'
import type LoopElement from '../element/kind/directive/loop-element'
import type BlockElement from '../element/kind/block/block-element'
import type TreeNode from '../tree/tree-node'
import ContentHost from '../element/content-host'

namespace RuntimeTree {
  export type AppRuntime = {
    projectNode: TreeNode.Node
    appNode: TreeNode.Node
    entryNode: TreeNode.Node | null
    stateNodes: TreeNode.Node[]
    componentNodes: TreeNode.Node[]
    styleNodes: TreeNode.Node[]
  }

  export const isAppNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: AppElement.Element } => (
    node.element.kind === 'app'
  )

  export const isComponentNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: ComponentElement.Element } => (
    node.element.kind === 'component'
  )

  export const isEntryComponentNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: ComponentElement.Element } => (
    isComponentNode(node) && node.element.local !== true
  )

  export const isEntryNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: EntryElement.Element } => (
    node.element.kind === 'entry'
  )

  export const isStyleNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: StyleElement.Element } => (
    node.element.kind === 'style'
  )

  export const isStateNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: StateElement.Element } => (
    node.element.kind === 'state'
  )

  export const isTagNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: TagElement.Element } => (
    node.element.kind === 'tag'
  )

  export const isTextNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: TextElement.Element } => (
    node.element.kind === 'text'
  )

  export const isComponentUseNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: ComponentUseElement.Element } => (
    node.element.kind === 'component-use'
  )

  export const isSlotUseNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: SlotUseElement.Element } => (
    node.element.kind === 'slot-use'
  )

  export const isConditionalNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: ConditionalElement.Element } => (
    node.element.kind === 'conditional'
  )

  export const isSwitchNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: SwitchElement.Element } => (
    node.element.kind === 'switch'
  )

  export const isLoopNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: LoopElement.Element } => (
    node.element.kind === 'loop'
  )

  export const isBlockNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: BlockElement.Element } => (
    node.element.kind === 'block'
  )

  export const isViewNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & {
    element:
      | TagElement.Element
      | TextElement.Element
      | ComponentUseElement.Element
      | SlotUseElement.Element
      | ConditionalElement.Element
      | SwitchElement.Element
      | LoopElement.Element
      | BlockElement.Element
  } => (
    isTagNode(node)
    || isTextNode(node)
    || isComponentUseNode(node)
    || isSlotUseNode(node)
    || isConditionalNode(node)
    || isSwitchNode(node)
    || isLoopNode(node)
    || isBlockNode(node)
  )

  export const collectNodes = (
    node: TreeNode.Node,
    accept: (node: TreeNode.Node) => boolean,
  ): TreeNode.Node[] => {
    const nodes = accept(node) ? [node] : []
    node.children.forEach((child) => {
      nodes.push(...collectNodes(child, accept))
    })
    return nodes
  }

  export const createAppRuntime = (
    appNode: TreeNode.Node,
    projectNode: TreeNode.Node,
  ): AppRuntime => ({
    projectNode,
    appNode,
    entryNode: collectNodes(appNode, isEntryNode)[0] ?? null,
    stateNodes: getAppStateNodes(appNode),
    componentNodes: collectNodes(appNode, isEntryComponentNode),
    styleNodes: collectNodes(appNode, isStyleNode),
  })

  export const getEntryComponentNode = (
    runtime: AppRuntime,
  ): TreeNode.Node | null => {
    const entry = runtime.entryNode?.element
    if (entry?.kind !== 'entry' || entry.componentId == null) return null

    return runtime.componentNodes.find((node) => (
      node.element.kind === 'component' && node.element.id === entry.componentId
    )) ?? null
  }

  export const getComponentRootViewNodes = (
    componentNode: TreeNode.Node,
  ): TreeNode.Node[] => {
    return ContentHost.getContentChildren(componentNode).filter(isViewNode)
  }

  export const getComponentStateNodes = (
    componentNode: TreeNode.Node,
  ): TreeNode.Node[] => {
    const storeNode = componentNode.children.find((child) => child.element.kind === 'store')
    const statesNode = storeNode?.children.find((child) => child.element.kind === 'states')
    return statesNode?.children.filter(isStateNode) ?? []
  }

  export const getAppStateNodes = (
    appNode: TreeNode.Node,
  ): TreeNode.Node[] => {
    const storeNode = appNode.children.find((child) => child.element.kind === 'store')
    const statesNode = storeNode?.children.find((child) => child.element.kind === 'states')
    return statesNode?.children.filter(isStateNode) ?? []
  }

  export const createStyleMap = (
    runtime: AppRuntime,
  ): Map<string, StyleElement.Element> => {
    const styleMap = new Map<string, StyleElement.Element>()
    runtime.styleNodes.forEach((node) => {
      if (node.element.kind === 'style') {
        styleMap.set(node.element.id, node.element)
      }
    })
    return styleMap
  }
}

export default RuntimeTree
