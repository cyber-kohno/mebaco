import type TreeNode from '@system/model/tree/tree-node'
import type TreeStore from '@system/workspace/tree/state'

namespace EditHistoryLog {
  export type ChangeType = 'added' | 'removed' | 'updated'

  export type ChangedNode = {
    nodeId: number
    kind: string
    change: ChangeType
  }

  export type Snapshot = {
    rootNode: TreeNode.Node
    selectedNodeId: number
    viewRootNodeId: number | null
  }

  export type Entry = {
    revision: number
    previousRevision: number
    source: TreeStore.TransactionSource
    label: string
    timestamp: string
    changedNodes: readonly ChangedNode[]
    snapshot: Snapshot
  }

  const maxEntries = 500
  let entries: Entry[] = []

  const flatten = (rootNode: TreeNode.Node): Map<number, TreeNode.Node> => {
    const nodes = new Map<number, TreeNode.Node>()
    const visit = (node: TreeNode.Node) => {
      nodes.set(node.id, node)
      node.children.forEach(visit)
    }
    visit(rootNode)
    return nodes
  }

  const signature = (node: TreeNode.Node): string => JSON.stringify({
    element: node.element,
    isOpen: node.isOpen,
    disabled: node.disabled ?? false,
    childIds: node.children.map((child) => child.id),
  })

  const collectChangedNodes = (
    previousRootNode: TreeNode.Node,
    rootNode: TreeNode.Node,
  ): ChangedNode[] => {
    const previousNodes = flatten(previousRootNode)
    const nodes = flatten(rootNode)
    const nodeIds = new Set([...previousNodes.keys(), ...nodes.keys()])

    return [...nodeIds]
      .sort((left, right) => left - right)
      .flatMap((nodeId): ChangedNode[] => {
        const previousNode = previousNodes.get(nodeId)
        const node = nodes.get(nodeId)
        if (previousNode == null && node != null) {
          return [{ nodeId, kind: node.element.kind, change: 'added' as const }]
        }
        if (previousNode != null && node == null) {
          return [{ nodeId, kind: previousNode.element.kind, change: 'removed' as const }]
        }
        if (previousNode != null && node != null && signature(previousNode) !== signature(node)) {
          return [{ nodeId, kind: node.element.kind, change: 'updated' as const }]
        }
        return []
      })
  }

  export const record = (
    commit: TreeStore.TransactionCommit,
    viewRootNodeId: number | null = null,
  ): void => {
    const entry: Entry = {
      revision: commit.revision,
      previousRevision: commit.previousRevision,
      source: commit.options.source,
      label: commit.options.label,
      timestamp: new Date().toISOString(),
      changedNodes: collectChangedNodes(commit.previousRootNode, commit.rootNode),
      snapshot: {
        rootNode: commit.rootNode,
        selectedNodeId: commit.selectedNodeId,
        viewRootNodeId,
      },
    }
    entries = [...entries, entry].slice(-maxEntries)
  }

  export const initialize = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
    viewRootNodeId: number | null,
  ): void => {
    entries = [{
      revision: 0,
      previousRevision: 0,
      source: 'system',
      label: 'Project loaded',
      timestamp: new Date().toISOString(),
      changedNodes: [],
      snapshot: { rootNode, selectedNodeId, viewRootNodeId },
    }]
  }

  export const clear = (): void => {
    entries = []
  }

  export const getEntries = (): readonly Entry[] => [...entries]

  export const getEntry = (revision: number): Entry | null => (
    entries.find((entry) => entry.revision === revision) ?? null
  )

  export const updateLatestViewRootNodeId = (viewRootNodeId: number | null): void => {
    const latest = entries.at(-1)
    if (latest == null) return
    entries = [
      ...entries.slice(0, -1),
      { ...latest, snapshot: { ...latest.snapshot, viewRootNodeId } },
    ]
  }
}

export default EditHistoryLog
