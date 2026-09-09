import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ClientPackage from './client-package'
import type { ClientLaunchRequest } from '../../infra/tauri/client-launch'

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  find: vi.fn(),
  open: vi.fn(),
  launcherLabel: vi.fn(() => 'Main'),
}))

vi.mock('./client-package-store', () => ({
  default: { initialize: mocks.initialize, find: mocks.find },
}))
vi.mock('./client-launcher', () => ({
  default: { open: mocks.open },
}))
vi.mock('./client-package', () => ({
  default: { launcherLabel: mocks.launcherLabel },
}))

import ClientDirectLauncher from './client-direct-launcher'

const request: ClientLaunchRequest = {
  workspaceId: 'default',
  installationId: 'installation-uuid',
  bundleId: 'bundle-uuid',
  launcherId: 'launcher-uuid',
}
const installedPackage = {
  installationId: 'installation-uuid',
  manifest: { bundle: { bundleId: 'bundle-uuid' } },
  module: { launchers: [{ launcherId: 'launcher-uuid', id: 'main' }] },
} as unknown as ClientPackage.Installed

describe('ClientDirectLauncher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.initialize.mockResolvedValue({ packages: [], warnings: [] })
    mocks.find.mockReturnValue(installedPackage)
    mocks.open.mockResolvedValue({ status: 'opened' })
  })

  it('resolves the persisted installation and launches it', async () => {
    await expect(ClientDirectLauncher.open(request)).resolves.toEqual({
      status: 'opened',
      title: 'Main - Mebaco',
    })
    expect(mocks.open).toHaveBeenCalledWith(installedPackage, 'launcher-uuid')
  })

  it('rejects a shortcut when its Bundle identity no longer matches', async () => {
    const mismatched = {
      ...installedPackage,
      manifest: { bundle: { bundleId: 'another-bundle' } },
    } as ClientPackage.Installed
    mocks.find.mockReturnValue(mismatched)

    const result = await ClientDirectLauncher.open(request)

    expect(result.status).toBe('invalid')
    expect(mocks.open).not.toHaveBeenCalled()
  })

  it('reports an uninstalled package without entering the runtime', async () => {
    mocks.find.mockReturnValue(null)

    const result = await ClientDirectLauncher.open(request)

    expect(result.status).toBe('invalid')
    expect(mocks.open).not.toHaveBeenCalled()
  })
})
