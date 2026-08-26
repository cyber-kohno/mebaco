import type MebacoElement from '../element/element'
import ComponentsElement from '../element/kind/declare/components-element'
import DeclaresElement from '../element/kind/declare/declares-element'
import FunctionsElement from '../element/kind/declare/functions-element'
import TypesElement from '../element/kind/declare/types-element'
import StylesElement from '../element/kind/declare/styles-element'
import AppsElement from '../element/kind/project/apps-element'
import CommonElement from '../element/kind/project/common-element'
import LaunchersElement from '../element/kind/project/launchers-element'
import ProjectElement from '../element/kind/project/project-element'

namespace TreeNode {
  export type Node = {
    id: number
    element: MebacoElement.Element
    isOpen: boolean
    disabled?: boolean
    children: Node[]
  }

  export type Seed = {
    element: MebacoElement.Element
    isOpen?: boolean
    children?: Seed[]
  }

  export type SelectionRelations = {
    ancestorIds: ReadonlySet<number>
    siblingIds: ReadonlySet<number>
  }

  export type VisibleNode = {
    node: Node
    parentNode: Node | null
    isPreview: false
  }

  export const createRootNode = (): Node => ({
    id: 1,
    element: ProjectElement.create(),
    isOpen: true,
    children: [
      {
        id: 2,
        element: AppsElement.create(),
        isOpen: true,
        children: [],
      },
      {
        id: 3,
        element: LaunchersElement.create(),
        isOpen: true,
        children: [],
      },
      {
        id: 4,
        element: CommonElement.create(),
        isOpen: false,
        children: [
          {
            id: 5,
            element: DeclaresElement.create(),
            isOpen: true,
            children: [
              {
                id: 6,
                element: StylesElement.create(),
                isOpen: true,
                children: [],
              },
              {
                id: 7,
                element: TypesElement.create(),
                isOpen: true,
                children: [],
              },
              {
                id: 8,
                element: FunctionsElement.create(),
                isOpen: true,
                children: [],
              },
              {
                id: 9,
                element: ComponentsElement.create(),
                isOpen: true,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  })

  export const clone = (node: Node): Node => ({
    ...node,
    children: node.children.map(clone),
  })

  export const findNode = (node: Node, nodeId: number): Node | null => {
    if (node.id === nodeId) return node
    for (const child of node.children) {
      const found = findNode(child, nodeId)
      if (found != null) return found
    }
    return null
  }

  export const findPath = (
    rootNode: Node,
    nodeId: number,
    path: Node[] = [],
  ): Node[] | null => {
    const nextPath = [...path, rootNode]
    if (rootNode.id === nodeId) return nextPath

    for (const child of rootNode.children) {
      const found = findPath(child, nodeId, nextPath)
      if (found != null) return found
    }

    return null
  }

  export const findParent = (
    rootNode: Node,
    nodeId: number,
  ): Node | null => {
    for (const child of rootNode.children) {
      if (child.id === nodeId) return rootNode
      const found = findParent(child, nodeId)
      if (found != null) return found
    }
    return null
  }

  export const isDescendantOrSelf = (
    rootNode: Node,
    ancestorNodeId: number,
    targetNodeId: number,
  ): boolean => {
    const path = findPath(rootNode, targetNodeId)
    return path?.some((node) => node.id === ancestorNodeId) === true
  }

  export const openPath = (
    rootNode: Node,
    fromNodeId: number,
    targetNodeId: number,
  ): boolean => {
    const path = findPath(rootNode, targetNodeId)
    if (path == null) return false

    const fromIndex = path.findIndex((node) => node.id === fromNodeId)
    if (fromIndex < 0) return false

    let changed = false
    path.slice(fromIndex, -1).forEach((node) => {
      if (node.children.length > 0 && !node.isOpen) {
        node.isOpen = true
        changed = true
      }
    })
    return changed
  }

  export const getSelectionRelations = (
    rootNode: Node,
    selectedNodeId: number,
  ): SelectionRelations => {
    const path: Node[] = []

    const findPath = (node: Node): boolean => {
      path.push(node)
      if (node.id === selectedNodeId) return true

      for (const child of node.children) {
        if (findPath(child)) return true
      }

      path.pop()
      return false
    }

    if (!findPath(rootNode)) {
      return { ancestorIds: new Set(), siblingIds: new Set() }
    }

    const parentNode = path.length > 1 ? path[path.length - 2] : null
    return {
      ancestorIds: new Set(path.slice(0, -1).map((node) => node.id)),
      siblingIds: new Set(
        parentNode?.children
          .filter((node) => node.id !== selectedNodeId)
          .map((node) => node.id)
        ?? [],
      ),
    }
  }

  export const getVisibleNodes = (
    rootNode: Node,
  ): VisibleNode[] => {
    const result: VisibleNode[] = []

    const collect = (node: Node, parentNode: Node | null) => {
      result.push({ node, parentNode, isPreview: false })
      if (!node.isOpen) return
      node.children.forEach((child) => collect(child, node))
    }

    collect(rootNode, null)
    return result
  }
}

export default TreeNode
