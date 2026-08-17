import type MebacoElement from './element'
import type TreeNode from '../tree/tree-node'
import type { Component } from 'svelte'
import type ActionMenuState from '../action-menu/action-menu-state'

const ElementDefinition = {}

namespace ElementDefinition {
  export type TreeLabelTone =
    | 'root'
    | 'folder'
    | 'manager'
    | 'master'
    | 'item'
    | 'variable'
    | 'container'
    | 'block'
    | 'condition'
    | 'iteration'

  export type ChildSlot<TElement extends MebacoElement.Element> = {
    name: string
    getChildren: (element: TElement) => MebacoElement.Element[]
  }

  export type TreeLabelProps<TElement extends MebacoElement.Element> = {
    element: TElement
  }

  export type StaticTreeLabel<TElement extends MebacoElement.Element> = {
    type: 'static'
    kindText: string
    tone: TreeLabelTone
    getValueText?: (element: TElement) => string | undefined
  }

  export type ComponentTreeLabel<TElement extends MebacoElement.Element> = {
    type: 'component'
    Component: Component<TreeLabelProps<TElement>>
  }

  export type TreeLabel<TElement extends MebacoElement.Element> =
    | StaticTreeLabel<TElement>
    | ComponentTreeLabel<TElement>

  export type ContextMenuContext<TElement extends MebacoElement.Element> = {
    element: TElement
    node: TreeNode.Node
    parentNode: TreeNode.Node | null
    rootNode: TreeNode.Node
  }

  export type Definition<TElement extends MebacoElement.Element> = {
    kind: TElement['kind']
    treeLabel: TreeLabel<TElement>
    createInitialChildren?: (element: TElement) => TreeNode.Seed[]
    syncChildren?: (
      node: TreeNode.Node & { element: TElement },
      rootNode: TreeNode.Node,
      createNode: (seed: TreeNode.Seed) => TreeNode.Node,
    ) => void
    getContextMenu: (context: ContextMenuContext<TElement>) => ActionMenuState.Item[]
    contentHost?: {
      retention: 'optional' | 'required'
    }
    childSlots: readonly ChildSlot<TElement>[]
    canDisable: boolean
  }
}

export default ElementDefinition
