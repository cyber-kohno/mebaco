import { get, writable } from 'svelte/store'
import type MebacoElement from '../element/element'
import ElementRegistry from '../element/element-registry'
import TreeNode from '../tree/tree-node'
import TreeReorder from '../tree/tree-reorder'
import ExpressionVerificationStore from '../validation/expression/expression-verification-store'
import ElementMutationCoordinator from '../element/mutation/element-mutation-coordinator'
import ElementMutationReport from '../element/mutation/element-mutation-report'
import ExpressionVerificationScope from '../validation/expression/expression-verification-scope'
import ExpressionVerificationImpact from '../validation/expression/expression-verification-impact'

namespace TreeStore {
  export type LifecycleEvent =
    | { type: 'remove'; parentNodeId: number | null }
    | { type: 'change' }
    | { type: 'replace' }

  export type LifecycleListener = (event: LifecycleEvent) => void

  export type NodeTransformer = (
    node: TreeNode.Node,
    createNode: (seed: TreeNode.Seed) => TreeNode.Node,
  ) => boolean

  const initialRootNode = TreeNode.createRootNode()
  export const rootNode = writable<TreeNode.Node>(initialRootNode)
  export const selectedNodeId = writable<number>(1)

  let nextNodeId = findMaxNodeId(initialRootNode) + 1
  const lifecycleListeners = new Set<LifecycleListener>()

  export const onLifecycle = (
    listener: LifecycleListener,
  ): (() => void) => {
    lifecycleListeners.add(listener)
    return () => lifecycleListeners.delete(listener)
  }

  const notifyLifecycle = (event: LifecycleEvent) => {
    lifecycleListeners.forEach((listener) => listener(event))
  }

  function findMaxNodeId(node: TreeNode.Node): number {
    return node.children.reduce(
      (maxId, child) => Math.max(maxId, findMaxNodeId(child)),
      node.id,
    )
  }

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

  export const addChildAndGetId = (
    parentNodeId: number,
    element: MebacoElement.Element,
    index?: number,
  ): number => {
    const childNode = createNode(
      { element },
      { collapseGeneratedChildren: true },
    )

    let mutationReport = ElementMutationReport.empty()
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
        mutationReport = ElementMutationCoordinator.afterAdd(nextRoot, addedNode)
      }
      return nextRoot
    })
    ExpressionVerificationStore.invalidate(mutationReport.verificationImpact)
    selectedNodeId.set(childNode.id)
    return childNode.id
  }

  export const addChild = (
    parentNodeId: number,
    element: MebacoElement.Element,
    index?: number,
  ): void => {
    addChildAndGetId(parentNodeId, element, index)
  }

  export const updateElement = (
    nodeId: number,
    element: MebacoElement.Element,
  ) => {
    let mutationReport = ElementMutationReport.empty()
    rootNode.update((root) => {
      const result = createUpdatedRootWithReport(root, nodeId, element)
      mutationReport = result.report
      return result.rootNode
    })
    ExpressionVerificationStore.invalidate(mutationReport.verificationImpact)
    selectedNodeId.set(nodeId)
    notifyLifecycle({ type: 'change' })
  }

  export const createUpdatedRoot = (
    root: TreeNode.Node,
    nodeId: number,
    element: MebacoElement.Element,
  ): TreeNode.Node => createUpdatedRootWithReport(root, nodeId, element).rootNode

  export const createUpdatedRootWithReport = (
    root: TreeNode.Node,
    nodeId: number,
    element: MebacoElement.Element,
    impactPreviousElement?: MebacoElement.Element,
  ): { rootNode: TreeNode.Node; report: ElementMutationReport.Value } => {
    const previousElement = TreeNode.findNode(root, nodeId)?.element
    if (previousElement == null) throw new Error(`node-${nodeId} was not found.`)
    const nextRoot = TreeNode.clone(root)
    if (!updateElementRec(nextRoot, nodeId, element, nextRoot)) {
      throw new Error(`node-${nodeId} was not found.`)
    }
    return {
      rootNode: nextRoot,
      report: ElementMutationCoordinator.afterUpdate(
        root,
        nextRoot,
        nodeId,
        previousElement,
        element,
        impactPreviousElement,
      ),
    }
  }

  export const commitRootChange = (
    nextRootNode: TreeNode.Node,
  ) => {
    const nextRoot = TreeNode.clone(nextRootNode)
    rootNode.set(nextRoot)
    nextNodeId = Math.max(nextNodeId, findMaxNodeId(nextRoot) + 1)
    notifyLifecycle({ type: 'change' })
  }

  export const removeNode = (
    nodeId: number,
  ) => {
    let parentNodeId: number | null = null
    let mutationReport = ElementMutationReport.empty()

    rootNode.update((root) => {
      const nextRoot = TreeNode.clone(root)
      const removedNode = TreeNode.findNode(nextRoot, nodeId)
      if (removedNode != null) {
        mutationReport = ElementMutationCoordinator.beforeRemove(nextRoot, removedNode)
      }
      parentNodeId = removeNodeRec(nextRoot, nodeId)
      return nextRoot
    })

    if (parentNodeId != null) selectedNodeId.set(parentNodeId)
    ExpressionVerificationStore.invalidate(mutationReport.verificationImpact)
    notifyLifecycle({ type: 'remove', parentNodeId })
  }

  export const toggleDisabled = (nodeId: number) => {
    rootNode.update((root) => {
      const nextRoot = TreeNode.clone(root)
      const target = TreeNode.findNode(nextRoot, nodeId)
      if (
        target == null
        || !ElementRegistry.get(target.element.kind).canDisable
      ) return root

      target.disabled = !target.disabled
      return nextRoot
    })
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

    if (changed) {
      selectedNodeId.set(nodeId)
      notifyLifecycle({ type: 'change' })
    }
    return changed
  }

  export const canMoveNode = (
    nodeId: number,
    direction: TreeReorder.Direction,
  ): boolean => TreeReorder.canMove(
    get(rootNode),
    nodeId,
    direction,
    (node) => ElementRegistry.get(node.element.kind).reorderGroup ?? null,
  )

  export const moveNode = (
    nodeId: number,
    direction: TreeReorder.Direction,
  ): boolean => {
    let changed = false
    let verificationImpact = ExpressionVerificationImpact.none()
    rootNode.update((root) => {
      const nextRoot = TreeNode.clone(root)
      const path = TreeNode.findPath(nextRoot, nodeId) ?? []
      const parentNode = path.at(-2)
      changed = TreeReorder.move(nextRoot, nodeId, direction, (node) => (
        ElementRegistry.get(node.element.kind).reorderGroup ?? null
      ))
      if (changed && parentNode?.element.kind === 'style-locals') {
        const styleNode = [...path].reverse().find((node) => node.element.kind === 'style')
        if (styleNode != null) {
          verificationImpact = ExpressionVerificationImpact.nodes(
            ExpressionVerificationScope.collectSubtreeVerificationNodeIds(
              nextRoot,
              styleNode.id,
            ),
          )
        }
      }
      return changed ? nextRoot : root
    })
    if (changed) {
      ExpressionVerificationStore.invalidate(verificationImpact)
      selectedNodeId.set(nodeId)
      notifyLifecycle({ type: 'change' })
    }
    return changed
  }

  export const replaceRoot = (nextRootNode: TreeNode.Node) => {
    const nextRoot = TreeNode.clone(nextRootNode)
    rootNode.set(nextRoot)
    selectedNodeId.set(nextRoot.id)
    nextNodeId = findMaxNodeId(nextRoot) + 1
    notifyLifecycle({ type: 'replace' })
  }
}

export default TreeStore
