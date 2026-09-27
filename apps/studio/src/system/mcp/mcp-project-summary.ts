import type TreeNode from '@system/model/tree/tree-node'

export type McpProjectSummary = {
  nodeCount: number
  selectedNodeId: number | null
  rootKind: string
  kindCounts: Record<string, number>
  dirty: boolean
  revision: number
}

export const createMcpProjectSummary = (
  rootNode: TreeNode.Node,
  selectedNodeId: number,
  dirty: boolean,
  revision: number,
): McpProjectSummary => {
  let nodeCount = 0
  const kindCounts: Record<string, number> = {}
  let selectedExists = false

  const visit = (node: TreeNode.Node) => {
    nodeCount += 1
    const kind = node.element.kind
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1
    if (node.id === selectedNodeId) selectedExists = true
    node.children.forEach(visit)
  }
  visit(rootNode)

  return {
    nodeCount,
    selectedNodeId: selectedExists ? selectedNodeId : null,
    rootKind: rootNode.element.kind,
    kindCounts: Object.fromEntries(
      Object.entries(kindCounts).sort(([left], [right]) => left.localeCompare(right)),
    ),
    dirty,
    revision,
  }
}
