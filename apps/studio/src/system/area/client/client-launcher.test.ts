import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ClientPackage from './client-package'

const mocks = vi.hoisted(() => ({
  analyzeLauncher: vi.fn(),
  createRuntimeProject: vi.fn(() => ({ id: -1, element: { kind: 'project' }, children: [] })),
  previewOpen: vi.fn(() => true),
}))

vi.mock('./client-package', () => ({
  default: {
    analyzeLauncher: mocks.analyzeLauncher,
    createRuntimeProject: mocks.createRuntimeProject,
  },
}))
vi.mock('../../runtime/preview/preview-controller', () => ({
  default: { open: mocks.previewOpen },
}))

import ClientLauncher from './client-launcher'

const installedPackage = {
  module: {
    launchers: [{ launcherId: 'launcher-uuid', id: 'main', appId: 'app-uuid' }],
  },
  resourcePaths: { 'resource-uuid': 'C:\\data' },
} as unknown as ClientPackage.Installed

describe('ClientLauncher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.analyzeLauncher.mockReturnValue({ errors: [], apps: [], resources: [] })
    mocks.previewOpen.mockReturnValue(true)
  })

  it('opens a validated Launcher through the shared preview runtime path', async () => {
    const result = await ClientLauncher.open(installedPackage, 'launcher-uuid')

    expect(result).toEqual({ status: 'opened' })
    expect(mocks.previewOpen).toHaveBeenCalledWith(expect.objectContaining({
      appDefinitionId: 'app-uuid',
      launcherId: 'launcher-uuid',
      resourcePaths: installedPackage.resourcePaths,
    }))
  })

  it('does not open when a required resource fails validation', async () => {
    const resource = { kind: 'directory-resource', resourceId: 'resource-uuid', id: 'work' }
    mocks.analyzeLauncher.mockReturnValue({
      errors: [],
      apps: [],
      resources: [{ element: resource }],
    })
    const validateResource = vi.fn(async () => false)

    const result = await ClientLauncher.open(installedPackage, 'launcher-uuid', {
      validateResource,
    })

    expect(result.status).toBe('invalid')
    expect(validateResource).toHaveBeenCalledWith(resource, 'C:\\data')
    expect(mocks.previewOpen).not.toHaveBeenCalled()
  })

  it('ignores elements that do not expose the requested Launcher', async () => {
    const result = await ClientLauncher.open(installedPackage, 'missing')

    expect(result.status).toBe('invalid')
    expect(mocks.analyzeLauncher).not.toHaveBeenCalled()
    expect(mocks.previewOpen).not.toHaveBeenCalled()
  })
})
