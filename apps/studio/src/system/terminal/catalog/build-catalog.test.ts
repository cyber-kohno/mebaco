import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommandContext } from '../command-types'

const mocks = vi.hoisted(() => ({
  appAreaStore: { value: 'develop' as unknown },
  developScreenStore: { value: 'workspace' as unknown },
  createRevisionCandidate: vi.fn(),
  updateElement: vi.fn(),
}))

vi.mock('svelte/store', () => ({ get: (store: { value: unknown }) => store.value }))
vi.mock('../../area/develop/develop-screen-store', () => ({ developScreenStore: mocks.developScreenStore }))
vi.mock('../../navigation/app-area-store', () => ({ appAreaStore: mocks.appAreaStore }))
vi.mock('../../release/release-package', () => ({
  default: { createRevisionCandidate: mocks.createRevisionCandidate },
}))
vi.mock('../../store/tree-store', () => ({ default: { updateElement: mocks.updateElement } }))

import createBuildCatalog from './build-catalog'

const context = (revision?: { generation: number; contentHash: string; builtAt: string }): CommandContext => ({
  rootNode: {
    id: 1,
    element: { kind: 'project' },
    isOpen: true,
    children: [{
      id: 2,
      element: { kind: 'bundle', bundleId: 'bundle-uuid', id: 'desktop', launcherIds: [], revision },
      isOpen: true,
      children: [],
    }],
  },
  selectedNodeId: 1,
  appendOutput: vi.fn(),
  clearOutputs: vi.fn(),
  close: vi.fn(),
  openPreview: vi.fn(),
  requestChoice: vi.fn(),
  requestInput: vi.fn(),
})

describe('build catalog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates Revision 1 and does not increment it for identical content', async () => {
    mocks.createRevisionCandidate.mockResolvedValue({ analysis: {}, moduleJson: {}, contentHash: 'a'.repeat(64) })
    const command = createBuildCatalog()
    const initial = context()
    await command.execute(initial, ['desktop'])

    expect(mocks.updateElement).toHaveBeenCalledWith(2, expect.objectContaining({
      revision: expect.objectContaining({ generation: 1, contentHash: 'a'.repeat(64) }),
    }))
    expect(initial.appendOutput).toHaveBeenLastCalledWith('success', "Bundle 'desktop' was built as Revision 1.")

    mocks.updateElement.mockClear()
    const unchanged = context({
      generation: 1,
      contentHash: 'a'.repeat(64),
      builtAt: '2026-09-09T00:00:00.000Z',
    })
    await command.execute(unchanged, ['desktop'])

    expect(mocks.updateElement).not.toHaveBeenCalled()
    expect(unchanged.appendOutput).toHaveBeenLastCalledWith(
      'success',
      "Bundle 'desktop' is already built at Revision 1. No changes were detected.",
    )

    mocks.createRevisionCandidate.mockResolvedValue({ analysis: {}, moduleJson: {}, contentHash: 'b'.repeat(64) })
    const changed = context({
      generation: 1,
      contentHash: 'a'.repeat(64),
      builtAt: '2026-09-09T00:00:00.000Z',
    })
    await command.execute(changed, ['desktop'])
    expect(mocks.updateElement).toHaveBeenCalledWith(2, expect.objectContaining({
      revision: expect.objectContaining({ generation: 2, contentHash: 'b'.repeat(64) }),
    }))
  })
})
