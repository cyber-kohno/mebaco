import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appAreaStore: { value: 'develop' as unknown },
  developScreenStore: { value: 'workspace' as unknown },
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
vi.mock('../../project/project-file', () => ({
  default: { save: vi.fn(), saveAs: vi.fn() },
}))

import createSaveCatalog from './save-catalog'
import type { CommandContext } from '../command-types'

describe('save catalog availability', () => {
  beforeEach(() => {
    mocks.appAreaStore.value = 'develop'
    mocks.developScreenStore.value = 'workspace'
  })

  it('is available only in the develop workspace', () => {
    const catalog = createSaveCatalog()
    const context = {} as CommandContext
    expect(catalog.isAvailable?.(context)).toBe(true)

    mocks.appAreaStore.value = 'client'
    expect(catalog.isAvailable?.(context)).toBe(false)

    mocks.appAreaStore.value = 'develop'
    mocks.developScreenStore.value = 'home'
    expect(catalog.isAvailable?.(context)).toBe(false)
  })
})
