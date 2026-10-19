import type App from '@system/model/app/app'
import type ComponentElement from '@system/model/component/component'
import type ComponentUseElement from '@system/model/component/component-use'
import type SlotUseElement from '@system/model/component/slot-use'
import type Entry from '@system/model/app/entry'
import type State from '@system/model/variable/state'
import type StyleElement from '@system/model/view/style/style'
import type TagElement from '@system/model/view/tag'
import type TextElement from '@system/model/view/text'
import type Conditional from '@system/model/directive/conditional'
import type SwitchElement from '@system/model/directive/switch'
import type LoopElement from '@system/model/directive/loop'
import type Block from '@system/model/block/block'
import type TreeNode from '@system/model/tree/tree-node'
import ContentHost from '@system/model/element/content-host'

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
  ): node is TreeNode.Node & { element: App.Element } => (
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
  ): node is TreeNode.Node & { element: Entry.Element } => (
    node.element.kind === 'entry'
  )

  export const isStyleNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: StyleElement.Element } => (
    node.element.kind === 'style'
  )

  export const isStateNode = (
    node: TreeNode.Node,
  ): node is TreeNode.Node & { element: State.Element } => (
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
  ): node is TreeNode.Node & { element: Conditional.Element } => (
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
  ): node is TreeNode.Node & { element: Block.Element } => (
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
      | Conditional.Element
      | SwitchElement.Element
      | LoopElement.Element
      | Block.Element
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
      node.element.kind === 'component' && node.element.componentId === entry.componentId
    )) ?? null
  }

  export const getEntryConfigurationError = (
    runtime: AppRuntime,
  ): string | null => {
    if (runtime.entryNode == null) return 'Entry is not configured.'
    if (runtime.entryNode.element.kind !== 'entry') {
      return 'Entry is not configured.'
    }
    if (runtime.entryNode.element.componentId == null) {
      return 'Entry component is not configured.'
    }
    if (getEntryComponentNode(runtime) == null) {
      return 'The configured Entry component was not found.'
    }
    return null
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
        styleMap.set(node.element.styleId, node.element)
      }
    })
    return styleMap
  }
}

export default RuntimeTree
