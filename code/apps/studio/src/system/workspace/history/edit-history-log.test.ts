import { beforeEach, describe, expect, it } from 'vitest'
import EditHistoryLog from './edit-history-log'

const node = (id: number, kind: string, children: any[] = []): any => ({
  id,
  element: { kind },
  isOpen: true,
  children,
})

describe('EditHistoryLog', () => {
  beforeEach(() => EditHistoryLog.clear())

  it('keeps the loaded project as history zero', () => {
    const rootNode = node(1, 'project')

    EditHistoryLog.initialize(rootNode, 1, null)

    expect(EditHistoryLog.getEntries()).toMatchObject([{
      revision: 0,
      source: 'system',
      label: 'Project loaded',
      changedNodes: [],
      snapshot: { rootNode, selectedNodeId: 1, viewRootNodeId: null },
    }])
  })

  it('records the source, label, revision, and affected nodes', () => {
    EditHistoryLog.record({
      options: { source: 'mcp', label: 'Update button action' },
      previousRootNode: node(1, 'project', [node(2, 'tag')]),
      rootNode: node(1, 'project', [node(2, 'tag'), node(3, 'text')]),
      previousSelectedNodeId: 1,
      selectedNodeId: 3,
      previousRevision: 4,
      revision: 5,
      lifecycleEvents: [],
    })

    expect(EditHistoryLog.getEntries()).toMatchObject([{
      revision: 5,
      previousRevision: 4,
      source: 'mcp',
      label: 'Update button action',
      changedNodes: [
        { nodeId: 1, kind: 'project', change: 'updated' },
        { nodeId: 3, kind: 'text', change: 'added' },
      ],
    }])
  })

  it('returns entries in chronological order and clears on request', () => {
    const createCommit = (revision: number) => ({
      options: { source: 'user' as const, label: `Change ${revision}` },
      previousRootNode: node(1, 'project'),
      rootNode: node(1, 'project', [node(revision + 1, 'tag')]),
      previousSelectedNodeId: 1,
      selectedNodeId: 1,
      previousRevision: revision - 1,
      revision,
      lifecycleEvents: [],
    })
    EditHistoryLog.record(createCommit(1))
    EditHistoryLog.record(createCommit(2))

    expect(EditHistoryLog.getEntries().map((entry) => entry.revision)).toEqual([1, 2])
    EditHistoryLog.clear()
    expect(EditHistoryLog.getEntries()).toEqual([])
  })
})
