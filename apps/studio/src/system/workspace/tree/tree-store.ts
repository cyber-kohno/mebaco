import { get, writable } from 'svelte/store'
import type MebacoElement from '@system/model/element/element'
import ElementRegistry from '@system/workspace/element-definition/element-registry'
import TreeNode from '@system/model/tree/tree-node'
import { TreeReorder } from '@system/workspace/tree/reorder'
import { ExpressionVerificationStore } from '@system/workspace/validation/state'
import ElementMutationCoordinator from '@system/workspace/tree/mutation/element-mutation-coordinator'
import ElementMutationReport from '@system/model/element/mutation-report'
import { ExpressionVerificationScope } from '@system/model/validation/expression/scope'
import { ExpressionVerificationImpact } from '@system/model/validation/expression/impact'
import { ProjectTreeFactory } from '@system/project/tree-factory'

namespace TreeStore {
  export type LifecycleEvent =
    | { type: 'remove'; parentNodeId: number | null }
    | { type: 'change' }
    | { type: 'replace' }

  export type LifecycleListener = (event: LifecycleEvent) => void

  export type TransactionSource = 'user' | 'mcp' | 'undo' | 'redo' | 'restore' | 'system'

  export type TransactionOptions = {
    source: TransactionSource
    label: string
    expectedRevision?: number
  }

  export class RevisionConflictError extends Error {
    readonly code = 'REVISION_CONFLICT'

    constructor(
      readonly expectedRevision: number,
      readonly actualRevision: number,
    ) {
      super(`Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`)
      this.name = 'RevisionConflictError'
    }
  }

  export type TransactionCommit = {
    options: Readonly<TransactionOptions>
    previousRootNode: TreeNode.Node
    rootNode: TreeNode.Node
    previousSelectedNodeId: number
    selectedNodeId: number
    previousRevision: number
    revision: number
    lifecycleEvents: readonly LifecycleEvent[]
  }

  export type TransactionResult<Result> = {
    result: Result
    changed: boolean
  }

  export type TransactionListener = (commit: TransactionCommit) => void

  export type TransactionStart = {
    options: Readonly<TransactionOptions>
    rootNode: TreeNode.Node
    selectedNodeId: number
    revision: number
  }

  export type TransactionStartListener = (start: TransactionStart) => void

  export type NodeTransformer = (
    node: TreeNode.Node,
    createNode: (seed: TreeNode.Seed) => TreeNode.Node,
  ) => boolean

  const initialRootNode = ProjectTreeFactory.createRootNode()
  export const rootNode = writable<TreeNode.Node>(initialRootNode)
  export const selectedNodeId = writable<number>(1)
  export const revision = writable(0)

  let nextNodeId = findMaxNodeId(initialRootNode) + 1
  const lifecycleListeners = new Set<LifecycleListener>()
  const transactionListeners = new Set<TransactionListener>()
  const transactionStartListeners = new Set<TransactionStartListener>()

  type ActiveTransaction = {
    options: Readonly<TransactionOptions>
    previousRootNode: TreeNode.Node
    rootNode: TreeNode.Node
    previousSelectedNodeId: number
    selectedNodeId: number
    previousRevision: number
    previousNextNodeId: number
    changed: boolean
    lifecycleEvents: LifecycleEvent[]
    verificationImpacts: ExpressionVerificationImpact.Value[]
  }

  let activeTransaction: ActiveTransaction | null = null

  export const onLifecycle = (
    listener: LifecycleListener,
  ): (() => void) => {
    lifecycleListeners.add(listener)
    return () => lifecycleListeners.delete(listener)
  }

  export const onTransaction = (
    listener: TransactionListener,
  ): (() => void) => {
    transactionListeners.add(listener)
    return () => transactionListeners.delete(listener)
  }

  export const onTransactionStart = (
    listener: TransactionStartListener,
  ): (() => void) => {
    transactionStartListeners.add(listener)
    return () => transactionStartListeners.delete(listener)
  }

  const notifyLifecycle = (event: LifecycleEvent) => {
    if (activeTransaction != null) {
      activeTransaction.lifecycleEvents.push(event)
      return
    }
    lifecycleListeners.forEach((listener) => listener(event))
  }

  const invalidateVerification = (impact: ExpressionVerificationImpact.Value) => {
    if (activeTransaction != null) {
      activeTransaction.verificationImpacts.push(impact)
      return
    }
    ExpressionVerificationStore.invalidate(impact)
  }

  const updateRoot = (updater: (root: TreeNode.Node) => TreeNode.Node) => {
    if (activeTransaction == null) {
      rootNode.update(updater)
      return
    }

    const nextRoot = updater(activeTransaction.rootNode)
    if (nextRoot !== activeTransaction.rootNode) activeTransaction.changed = true
    activeTransaction.rootNode = nextRoot
  }

  const setSelectedNodeId = (nodeId: number) => {
    if (activeTransaction == null) {
      selectedNodeId.set(nodeId)
      return
    }
    activeTransaction.selectedNodeId = nodeId
  }

  export const transaction = <Result>(
    options: TransactionOptions,
    callback: () => Result,
  ): TransactionResult<Result> => {
    if (activeTransaction != null) {
      throw new Error('Nested tree transactions are not supported.')
    }

    const currentRevision = get(revision)
    if (
      options.expectedRevision != null
      && options.expectedRevision !== currentRevision
    ) {
      throw new RevisionConflictError(options.expectedRevision, currentRevision)
    }

    const transactionState: ActiveTransaction = {
      options: Object.freeze({ ...options }),
      previousRootNode: get(rootNode),
      rootNode: get(rootNode),
      previousSelectedNodeId: get(selectedNodeId),
      selectedNodeId: get(selectedNodeId),
      previousRevision: currentRevision,
      previousNextNodeId: nextNodeId,
      changed: false,
      lifecycleEvents: [],
      verificationImpacts: [],
    }
    transactionStartListeners.forEach((listener) => listener({
      options: transactionState.options,
      rootNode: transactionState.previousRootNode,
      selectedNodeId: transactionState.previousSelectedNodeId,
      revision: transactionState.previousRevision,
    }))
    activeTransaction = transactionState

    let result: Result
    try {
      result = callback()
    } catch (error) {
      nextNodeId = transactionState.previousNextNodeId
      activeTransaction = null
      throw error
    }

    if (
      result != null
      && (typeof result === 'object' || typeof result === 'function')
      && 'then' in result
    ) {
      nextNodeId = transactionState.previousNextNodeId
      activeTransaction = null
      throw new Error('Async tree transactions are not supported.')
    }

    activeTransaction = null
    if (!transactionState.changed) return { result, changed: false }

    const nextRevision = transactionState.previousRevision + 1
    revision.set(nextRevision)
    rootNode.set(transactionState.rootNode)
    if (transactionState.selectedNodeId !== transactionState.previousSelectedNodeId) {
      selectedNodeId.set(transactionState.selectedNodeId)
    }
    transactionState.verificationImpacts.forEach((impact) => (
      ExpressionVerificationStore.invalidate(impact)
    ))
    transactionState.lifecycleEvents.forEach((event) => (
      lifecycleListeners.forEach((listener) => listener(event))
    ))

    const commit: TransactionCommit = {
      options: transactionState.options,
      previousRootNode: transactionState.previousRootNode,
      rootNode: transactionState.rootNode,
      previousSelectedNodeId: transactionState.previousSelectedNodeId,
      selectedNodeId: transactionState.selectedNodeId,
      previousRevision: transactionState.previousRevision,
      revision: nextRevision,
      lifecycleEvents: transactionState.lifecycleEvents,
    }
    transactionListeners.forEach((listener) => listener(commit))
    return { result, changed: true }
  }

  const mutate = <Result>(label: string, callback: () => Result): Result => {
    if (activeTransaction != null) return callback()
    return transaction({ source: 'user', label }, callback).result
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
  ): number => mutate('Add tree node', () => {
    const childNode = createNode(
      { element },
      { collapseGeneratedChildren: true },
    )

    let mutationReport = ElementMutationReport.empty()
    updateRoot((root) => {
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
    invalidateVerification(mutationReport.verificationImpact)
    setSelectedNodeId(childNode.id)
    return childNode.id
  })

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
  ) => mutate('Update tree element', () => {
    let mutationReport = ElementMutationReport.empty()
    updateRoot((root) => {
      const result = createUpdatedRootWithReport(root, nodeId, element)
      mutationReport = result.report
      return result.rootNode
    })
    invalidateVerification(mutationReport.verificationImpact)
    setSelectedNodeId(nodeId)
    notifyLifecycle({ type: 'change' })
  })

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
  ) => mutate('Commit tree change', () => {
    updateRoot(() => TreeNode.clone(nextRootNode))
    nextNodeId = Math.max(nextNodeId, findMaxNodeId(nextRootNode) + 1)
    notifyLifecycle({ type: 'change' })
  })

  export const removeNode = (
    nodeId: number,
  ) => mutate('Remove tree node', () => {
    let parentNodeId: number | null = null
    let mutationReport = ElementMutationReport.empty()

    updateRoot((root) => {
      const nextRoot = TreeNode.clone(root)
      const removedNode = TreeNode.findNode(nextRoot, nodeId)
      if (removedNode != null) {
        mutationReport = ElementMutationCoordinator.beforeRemove(nextRoot, removedNode)
      }
      parentNodeId = removeNodeRec(nextRoot, nodeId)
      return parentNodeId == null ? root : nextRoot
    })

    if (parentNodeId != null) {
      setSelectedNodeId(parentNodeId)
      invalidateVerification(mutationReport.verificationImpact)
      notifyLifecycle({ type: 'remove', parentNodeId })
    }
  })

  export const toggleDisabled = (nodeId: number) => mutate('Toggle tree node', () => {
    updateRoot((root) => {
      const nextRoot = TreeNode.clone(root)
      const target = TreeNode.findNode(nextRoot, nodeId)
      if (
        target == null
        || !ElementRegistry.get(target.element.kind).canDisable
      ) return root

      target.disabled = !target.disabled
      return nextRoot
    })
  })

  export const transformNode = (
    nodeId: number,
    transformer: NodeTransformer,
  ): boolean => mutate('Transform tree node', () => {
    let changed = false

    updateRoot((root) => {
      const nextRoot = TreeNode.clone(root)
      changed = transformNodeRec(nextRoot, nodeId, transformer)
      return changed ? nextRoot : root
    })

    if (changed) {
      setSelectedNodeId(nodeId)
      notifyLifecycle({ type: 'change' })
    }
    return changed
  })

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
  ): boolean => mutate('Move tree node', () => {
    let changed = false
    let verificationImpact = ExpressionVerificationImpact.none()
    updateRoot((root) => {
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
      } else if (changed && parentNode?.element.kind === 'constants') {
        verificationImpact = ExpressionVerificationImpact.all()
      }
      return changed ? nextRoot : root
    })
    if (changed) {
      invalidateVerification(verificationImpact)
      setSelectedNodeId(nodeId)
      notifyLifecycle({ type: 'change' })
    }
    return changed
  })

  export const restoreHistorySnapshot = (
    snapshotRootNode: TreeNode.Node,
    snapshotSelectedNodeId: number,
    source: 'undo' | 'redo' | 'restore',
    label?: string,
  ): void => {
    transaction({
      source,
      label: label ?? (source === 'undo' ? 'Undo' : source === 'redo' ? 'Redo' : 'Restore history'),
    }, () => {
      const nextRoot = TreeNode.clone(snapshotRootNode)
      updateRoot(() => nextRoot)
      nextNodeId = Math.max(nextNodeId, findMaxNodeId(nextRoot) + 1)
      setSelectedNodeId(
        TreeNode.findNode(nextRoot, snapshotSelectedNodeId) == null
          ? nextRoot.id
          : snapshotSelectedNodeId,
      )
      notifyLifecycle({ type: 'change' })
    })
  }

  export const replaceRoot = (nextRootNode: TreeNode.Node) => {
    const nextRoot = TreeNode.clone(nextRootNode)
    rootNode.set(nextRoot)
    selectedNodeId.set(nextRoot.id)
    revision.set(0)
    nextNodeId = findMaxNodeId(nextRoot) + 1
    notifyLifecycle({ type: 'replace' })
  }
}

export default TreeStore
