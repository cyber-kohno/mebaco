import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import { confirmDialogStore } from '../../feedback/confirm/confirm-dialog-state'
import ToastController from '../../feedback/toast/toast-controller'
import ClientPackage from './client-package'
import ClientPackageController from './client-package-controller'
import ClientPackageStore from './client-package-store'

vi.mock('./client-package', () => ({ default: { parse: vi.fn() } }))
vi.mock('./client-package-store', () => ({ default: { install: vi.fn(), update: vi.fn() } }))
vi.mock('../../feedback/toast/toast-controller', () => ({ default: { show: vi.fn() } }))

afterEach(() => {
  ConfirmDialogController.clear()
  vi.clearAllMocks()
})

describe('ClientPackageController', () => {
  it('shows an OK-only error dialog instead of a toast for duplicate packages', async () => {
    vi.mocked(ClientPackage.parse).mockResolvedValue({} as never)
    vi.mocked(ClientPackageStore.install).mockResolvedValue({
      status: 'duplicate',
      installedPackage: { displayName: 'Sample App' },
    } as never)
    const file = { name: 'sample.mbcapp', arrayBuffer: async () => new ArrayBuffer(0) } as File

    const installation = ClientPackageController.installFile(file)
    await vi.waitFor(() => expect(get(confirmDialogStore)?.title)
      .toBe('Application Package is already installed'))

    expect(get(confirmDialogStore)).toMatchObject({
      tone: 'danger',
      message: ["The selected file 'sample.mbcapp' matches the installed package shown as 'Sample App'."],
      choices: [{ label: 'OK', role: 'proceed' }],
    })
    expect(ToastController.show).not.toHaveBeenCalled()

    await ConfirmDialogController.apply()
    await installation
  })

  it('rejects an update for a different Bundle UUID with an OK-only error dialog', async () => {
    vi.mocked(ClientPackage.parse).mockResolvedValue({} as never)
    vi.mocked(ClientPackageStore.update).mockResolvedValue({ status: 'mismatch' })
    const file = { name: 'other.mbcapp', arrayBuffer: async () => new ArrayBuffer(0) } as File

    const update = ClientPackageController.updateFile('installation-id', file)
    await vi.waitFor(() => expect(get(confirmDialogStore)?.title)
      .toBe('Application Package could not be updated'))

    expect(get(confirmDialogStore)).toMatchObject({
      tone: 'danger',
      message: ['The selected file belongs to a different application. Select a package with the same Bundle UUID.'],
      choices: [{ label: 'OK', role: 'proceed' }],
    })
    expect(ToastController.show).not.toHaveBeenCalled()

    await ConfirmDialogController.apply()
    await update
  })

  it('asks for confirmation before downgrading a package', async () => {
    const parsed = { manifest: { bundle: { generation: 2 } } }
    vi.mocked(ClientPackage.parse).mockResolvedValue(parsed as never)
    vi.mocked(ClientPackageStore.update)
      .mockResolvedValueOnce({
        status: 'downgrade',
        installedPackage: { manifest: { bundle: { generation: 4 } } },
      } as never)
      .mockResolvedValueOnce({
        status: 'updated',
        installedPackage: { displayName: 'Sample App' },
      } as never)
    const file = { name: 'revision-2.mbcapp', arrayBuffer: async () => new ArrayBuffer(0) } as File

    const update = ClientPackageController.updateFile('installation-id', file)
    await vi.waitFor(() => expect(get(confirmDialogStore)?.title).toBe('Downgrade Application Package?'))
    expect(get(confirmDialogStore)?.message).toEqual([
      'The installed package is Revision 4.',
      'The selected package is Revision 2.',
      'Downgrading may make existing launch settings incompatible.',
    ])

    await ConfirmDialogController.apply()
    await update

    expect(ClientPackageStore.update).toHaveBeenLastCalledWith(
      'installation-id', parsed, { allowDowngrade: true },
    )
    expect(ToastController.show).toHaveBeenCalledWith(
      'Sample App was downgraded to Revision 2.', { tone: 'success' },
    )
  })
})
