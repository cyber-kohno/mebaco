import { describe, expect, it } from 'vitest'
import type TreeNode from '@system/model/tree/tree-node'
import { createMcpProjectSummary } from './mcp-project-summary'

const root = {
  id: 1,
  element: { kind: 'project' },
  isOpen: true,
  children: [
    { id: 2, element: { kind: 'app' }, isOpen: true, children: [] },
    { id: 3, element: { kind: 'app' }, isOpen: false, children: [
      { id: 4, element: { kind: 'entry' }, isOpen: true, children: [] },
    ] },
  ],
} as unknown as TreeNode.Node

describe('createMcpProjectSummary', () => {
  it('counts the complete live tree regardless of collapsed nodes', () => {
    expect(createMcpProjectSummary(root, 4, true, 7)).toEqual({
      nodeCount: 4,
      selectedNodeId: 4,
      rootKind: 'project',
      kindCounts: { app: 2, entry: 1, project: 1 },
      dirty: true,
      revision: 7,
    })
  })

  it('returns null when the selected node is no longer present', () => {
    expect(createMcpProjectSummary(root, 99, false, 0).selectedNodeId).toBeNull()
  })
})
