import { writable } from 'svelte/store'
import type MebacoElement from '../element/element'
import ElementRegistry from '../element/element-registry'
import TreeNode from '../tree/tree-node'

namespace TreeStore {
  export type NodeTransformer = (
    node: TreeNode.Node,
    createNode: (seed: TreeNode.Seed) => TreeNode.Node,
  ) => boolean

  export const rootNode = writable<TreeNode.Node>(TreeNode.createRootNode())
  export const selectedNodeId = writable<number>(1)

  let nextNodeId = 10

  const findMaxNodeId = (node: TreeNode.Node): number => (
    node.children.reduce(
      (maxId, child) => Math.max(maxId, findMaxNodeId(child)),
      node.id,
    )
  )

  type CreateNodeOptions = {
    collapseGeneratedChildren?: boolean
  }

  const createNode = (
    seed: TreeNode.Seed,
    options: CreateNodeOptions = {},
  ): TreeNode.Node => {
    const node: TreeNode.Node = {
      id: nextNodeId,
      element: seed.element,
      isOpen: seed.isOpen ?? true,
      children: [],
    }
    nextNodeId += 1

    const definition = ElementRegistry.get(seed.element.kind)
    const definitionSeeds = definition.createInitialChildren?.(seed.element) ?? []
    node.children = [...definitionSeeds, ...(seed.children ?? [])].map((childSeed) => (
      createNode(
        options.collapseGeneratedChildren && childSeed.isOpen == null
          ? { ...childSeed, isOpen: false }
          : childSeed,
        options,
      )
    ))
    return node
  }

  const addChildRec = (
    node: TreeNode.Node,
    parentNodeId: number,
    childNode: TreeNode.Node,
    index?: number,
  ): boolean => {
    if (node.id === parentNodeId) {
      if (index == null) {
        node.children.push(childNode)
      } else {
        node.children.splice(index, 0, childNode)
      }
      node.isOpen = true
      return true
    }

    return node.children.some((child) => addChildRec(child, parentNodeId, childNode, index))
  }

  const findNodeRec = (
    node: TreeNode.Node,
    nodeId: number,
  ): TreeNode.Node | null => {
    if (node.id === nodeId) return node
    for (const child of node.children) {
      const found = findNodeRec(child, nodeId)
      if (found != null) return found
    }
    return null
  }

  const updateElementRec = (
    node: TreeNode.Node,
    nodeId: number,
    element: MebacoElement.Element,
    rootNode: TreeNode.Node,
  ): boolean => {
    if (node.id === nodeId) {
      node.element = element
      ElementRegistry.get(element.kind).syncChildren?.(
        node as TreeNode.Node & { element: never },
        rootNode,
        createNode,
      )
      return true
    }

    return node.children.some((child) => updateElementRec(child, nodeId, element, rootNode))
  }

  const removeNodeRec = (
    node: TreeNode.Node,
    nodeId: number,
  ): number | null => {
    const childIndex = node.children.findIndex((child) => child.id === nodeId)
    if (childIndex >= 0) {
      node.children.splice(childIndex, 1)
      return node.id
    }

    for (const child of node.children) {
      const parentNodeId = removeNodeRec(child, nodeId)
      if (parentNodeId != null) return parentNodeId
    }

    return null
  }

  const transformNodeRec = (
    node: TreeNode.Node,
    nodeId: number,
    transformer: NodeTransformer,
  ): boolean => {
    if (node.id === nodeId) return transformer(node, createNode)

    return node.children.some((child) => (
      transformNodeRec(child, nodeId, transformer)
    ))
  }

  export const addChild = (
    parentNodeId: number,
    element: MebacoElement.Element,
    index?: number,
  ) => {
    const childNode = createNode(
      { element },
      { collapseGeneratedChildren: true },
    )

    rootNode.update((root) => {
      const nextRoot = TreeNode.clone(root)
      addChildRec(nextRoot, parentNodeId, childNode, index)
      const addedNode = findNodeRec(nextRoot, childNode.id)
      if (addedNode != null) {
        ElementRegistry.get(addedNode.element.kind).syncChildren?.(
          addedNode as TreeNode.Node & { element: never },
          nextRoot,
          createNode,
        )
      }
      return nextRoot
    })
    selectedNodeId.set(childNode.id)
  }

  export const updateElement = (
    nodeId: number,
    element: MebacoElement.Element,
  ) => {
    rootNode.update((root) => {
      const nextRoot = TreeNode.clone(root)
      updateElementRec(nextRoot, nodeId, element, nextRoot)
      return nextRoot
    })
    selectedNodeId.set(nodeId)
  }

  export const removeNode = (
    nodeId: number,
  ) => {
    let parentNodeId: number | null = null

    rootNode.update((root) => {
      const nextRoot = TreeNode.clone(root)
      parentNodeId = removeNodeRec(nextRoot, nodeId)
      return nextRoot
    })

    if (parentNodeId != null) selectedNodeId.set(parentNodeId)
  }

  export const transformNode = (
    nodeId: number,
    transformer: NodeTransformer,
  ): boolean => {
    let changed = false

    rootNode.update((root) => {
      const nextRoot = TreeNode.clone(root)
      changed = transformNodeRec(nextRoot, nodeId, transformer)
      return changed ? nextRoot : root
    })

    if (changed) selectedNodeId.set(nodeId)
    return changed
  }

  export const replaceRoot = (nextRootNode: TreeNode.Node) => {
    const nextRoot = TreeNode.clone(nextRootNode)
    rootNode.set(nextRoot)
    selectedNodeId.set(nextRoot.id)
    nextNodeId = findMaxNodeId(nextRoot) + 1
  }
}

export default TreeStore
