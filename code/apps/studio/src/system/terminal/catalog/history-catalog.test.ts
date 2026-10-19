import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditHistoryLog from '@system/workspace/history/edit-history-log'
import type { CommandContext } from '../command-types'
import createHistoryCatalog from './history-catalog'

const mocks = vi.hoisted(() => ({
  restore: vi.fn(),
}))

vi.mock('svelte/store', () => ({ get: (store: { value: unknown }) => store.value }))
vi.mock('@system/workspace/tree/state', () => ({
  default: { revision: { value: 3 } },
}))
vi.mock('@system/workspace/history/controller', () => ({
  EditHistoryController: mocks,
}))

const createContext = (): CommandContext => ({
  appendOutput: vi.fn(),
  requestChoice: vi.fn(),
} as unknown as CommandContext)

describe('history catalog', () => {
  beforeEach(() => EditHistoryLog.clear())

  it('lists the current history number in chronological order', () => {
    EditHistoryLog.record({
      options: { source: 'mcp', label: 'Agent change' },
      previousRootNode: { id: 1, element: { kind: 'project' }, isOpen: true, children: [] },
      rootNode: { id: 1, element: { kind: 'project' }, isOpen: false, children: [] },
      previousSelectedNodeId: 1,
      selectedNodeId: 1,
      previousRevision: 2,
      revision: 3,
      lifecycleEvents: [],
    })
    const context = createContext()

    createHistoryCatalog().execute(context, [])

    expect(context.appendOutput).toHaveBeenCalledWith(
      'normal',
      expect.stringContaining('Current history: #3'),
    )
    expect(context.appendOutput).toHaveBeenCalledWith(
      'normal',
      expect.stringContaining('History #3 [Agent/MCP]'),
    )
  })

  it('keeps the restore completion available while typing its prefix', () => {
    const completions = createHistoryCatalog().complete?.({} as CommandContext, ['r'])

    expect(completions).toEqual([
      { label: 'restore', detail: 'Restore a previous history entry.', insertText: 'history restore' },
    ])
  })

  it('requests confirmation before restoring a history entry', async () => {
    EditHistoryLog.record({
      options: { source: 'user', label: 'User change' },
      previousRootNode: { id: 1, element: { kind: 'project' }, isOpen: true, children: [] },
      rootNode: { id: 1, element: { kind: 'project' }, isOpen: false, children: [] },
      previousSelectedNodeId: 1,
      selectedNodeId: 1,
      previousRevision: 0,
      revision: 1,
      lifecycleEvents: [],
    })
    const context = createContext()
    mocks.restore.mockResolvedValue(true)

    createHistoryCatalog().execute(context, ['restore', '1'])
    const requestChoice = context.requestChoice as ReturnType<typeof vi.fn>
    const onSelect = requestChoice.mock.calls[0][2] as (choiceId: string) => Promise<void>
    await onSelect('restore')

    expect(context.appendOutput).toHaveBeenCalledWith(
      'success',
      'Restored History #1. A new history entry was created.',
    )
  })
})
