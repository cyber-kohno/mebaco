import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommandContext } from '../command-types'

const mocks = vi.hoisted(() => ({
  appAreaStore: { value: 'develop' as unknown },
  developScreenStore: { value: 'workspace' as unknown },
  save: vi.fn(),
}))

vi.mock('svelte/store', () => ({
  get: (store: { value: unknown }) => store.value,
}))
vi.mock('../../area/develop/develop-screen-store', () => ({
  developScreenStore: mocks.developScreenStore,
}))
vi.mock('../../navigation/app-area-store', () => ({
  appAreaStore: mocks.appAreaStore,
}))
vi.mock('../../release/release-package', () => ({
  default: { save: mocks.save },
}))

import createReleaseCatalog from './release-catalog'

const context = (): CommandContext => ({
  rootNode: {
    id: 1,
    element: { kind: 'project' },
    isOpen: true,
    children: [{
      id: 2,
      element: { kind: 'bundle', bundleId: 'bundle-uuid', id: 'desktop', launcherIds: ['a'] },
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

describe('release catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.appAreaStore.value = 'develop'
    mocks.developScreenStore.value = 'workspace'
  })

  it('completes Bundle IDs and exports the selected Bundle', async () => {
    mocks.save.mockResolvedValue({ status: 'saved', fileName: 'desktop.mbcapp' })
    const command = createReleaseCatalog()
    const commandContext = context()

    expect(command.complete?.(commandContext, [])).toContainEqual({
      label: 'desktop', detail: '1 Launcher', insertText: 'release desktop',
    })
    await command.execute(commandContext, ['desktop'])

    expect(mocks.save).toHaveBeenCalledWith(
      commandContext.rootNode,
      expect.objectContaining({ bundleId: 'bundle-uuid' }),
    )
    expect(commandContext.appendOutput).toHaveBeenLastCalledWith(
      'success', 'Release package saved as desktop.mbcapp.',
    )
  })

  it('is available only in the develop workspace', () => {
    const command = createReleaseCatalog()
    expect(command.isAvailable?.(context())).toBe(true)
    mocks.appAreaStore.value = 'client'
    expect(command.isAvailable?.(context())).toBe(false)
  })
})
