import { get, writable } from 'svelte/store'
import type TreeNode from '../tree/tree-node'
import ExpressionSourceCatalog from './expression-source-catalog'
import type ExpressionVerifier from './expression-verifier'

namespace ExpressionVerificationStore {
  export type Entry = {
    status: ExpressionVerifier.Status
    messages: readonly string[]
    elementFingerprint: string
  }

  export const entries = writable<Record<number, Entry>>({})

  const fingerprint = (node: TreeNode.Node): string => JSON.stringify(node.element)

  const collectNodes = (
    node: TreeNode.Node,
    result: Map<number, TreeNode.Node> = new Map(),
  ): Map<number, TreeNode.Node> => {
    result.set(node.id, node)
    node.children.forEach((child) => collectNodes(child, result))
    return result
  }

  export const getStatus = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    currentEntries: Readonly<Record<number, Entry>> = get(entries),
  ): ExpressionVerifier.Status | null => {
    if (!ExpressionSourceCatalog.collect(rootNode, node).hasExpressionField) {
      return null
    }
    const entry = currentEntries[node.id]
    return entry?.elementFingerprint === fingerprint(node)
      ? entry.status
      : 'unverified'
  }

  export const setResult = (
    node: TreeNode.Node,
    result: ExpressionVerifier.Result,
  ) => {
    entries.update((current) => ({
      ...current,
      [node.id]: {
        status: result.status,
        messages: result.messages,
        elementFingerprint: fingerprint(node),
      },
    }))
  }

  export const syncRoot = (rootNode: TreeNode.Node) => {
    const nodes = collectNodes(rootNode)
    entries.update((current) => {
      const next: Record<number, Entry> = {}
      Object.entries(current).forEach(([nodeId, entry]) => {
        const node = nodes.get(Number(nodeId))
        if (node != null && entry.elementFingerprint === fingerprint(node)) {
          next[Number(nodeId)] = entry
        }
      })
      return next
    })
  }

  export const clear = () => entries.set({})
}

export default ExpressionVerificationStore
