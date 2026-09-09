import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ClientPackage from './client-package'

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  createShortcut: vi.fn(),
  launcherLabel: vi.fn(() => 'Main:Launcher'),
}))

vi.mock('../../ui/native-dialog-controller', () => ({
  default: { save: mocks.save },
}))
vi.mock('../../infra/tauri/client-launch', () => ({
  default: { createShortcut: mocks.createShortcut },
}))
vi.mock('./client-package', () => ({
  default: { launcherLabel: mocks.launcherLabel },
}))

import ClientLaunchShortcutController from './client-launch-shortcut-controller'

const installedPackage = {
  installationId: 'installation-uuid',
  displayName: 'Example:App.mbcapp',
  manifest: { bundle: { bundleId: 'bundle-uuid' } },
  module: { launchers: [{ launcherId: 'launcher-uuid', id: 'main' }] },
} as unknown as ClientPackage.Installed

describe('ClientLaunchShortcutController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.save.mockResolvedValue('C:\\Users\\User\\Desktop\\Example App')
    mocks.createShortcut.mockResolvedValue(undefined)
  })

  it('saves a Windows shortcut containing stable installation references', async () => {
    const result = await ClientLaunchShortcutController.create(
      installedPackage,
      'launcher-uuid',
    )

    expect(result).toBe('saved')
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: 'Example_App - Main_Launcher.lnk',
    }))
    expect(mocks.createShortcut).toHaveBeenCalledWith({
      destinationPath: 'C:\\Users\\User\\Desktop\\Example App.lnk',
      description: 'Launch Example_App - Main_Launcher with Mebaco',
      launch: {
        workspaceId: 'default',
        installationId: 'installation-uuid',
        bundleId: 'bundle-uuid',
        launcherId: 'launcher-uuid',
      },
    })
  })

  it('does not invoke the backend when the save dialog is cancelled', async () => {
    mocks.save.mockResolvedValue(null)

    await expect(ClientLaunchShortcutController.create(
      installedPackage,
      'launcher-uuid',
    )).resolves.toBe('cancelled')
    expect(mocks.createShortcut).not.toHaveBeenCalled()
  })
})
