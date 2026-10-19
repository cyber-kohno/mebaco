import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommandContext } from '../command-types'

const mocks = vi.hoisted(() => ({
  appAreaStore: { value: 'develop' as unknown },
  developScreenStore: { value: 'workspace' as unknown },
  projectSessionStore: { value: { path: 'C:\\projects\\sample.mbc', isDirty: false } as unknown },
  save: vi.fn(),
}))

vi.mock('svelte/store', () => ({
  get: (store: { value: unknown }) => store.value,
}))
vi.mock('@system/workspace/screen', () => ({
  developScreenStore: mocks.developScreenStore,
}))
vi.mock('@system/application/navigation', () => ({
  appAreaStore: mocks.appAreaStore,
}))
vi.mock('../../project/project-session-store', () => ({
  default: { store: mocks.projectSessionStore },
}))
vi.mock('@system/project/release/package', () => ({
  ReleasePackage: { save: mocks.save },
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
    mocks.projectSessionStore.value = { path: 'C:\\projects\\sample.mbc', isDirty: false }
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

  it('does not release a project that has never been saved', async () => {
    mocks.projectSessionStore.value = { path: null, isDirty: false }
    const commandContext = context()

    await createReleaseCatalog().execute(commandContext, ['desktop'])

    expect(mocks.save).not.toHaveBeenCalled()
    expect(commandContext.appendOutput).toHaveBeenLastCalledWith(
      'danger',
      'Project has not been saved. Save the project after building before releasing.',
    )
  })

  it('does not release a project with unsaved changes', async () => {
    mocks.projectSessionStore.value = { path: 'C:\\projects\\sample.mbc', isDirty: true }
    const commandContext = context()

    await createReleaseCatalog().execute(commandContext, ['desktop'])

    expect(mocks.save).not.toHaveBeenCalled()
    expect(commandContext.appendOutput).toHaveBeenLastCalledWith(
      'danger',
      'Project has unsaved changes. Save the project after building before releasing.',
    )
  })
})
