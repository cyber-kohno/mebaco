import { afterEach, describe, expect, it, vi } from 'vitest'
import type ResourceImportCatalog from '../../element/kind/app/import/resource-import-catalog'
import ClientResourcePathValidator from './client-resource-path-validator'

const directoryResource: ResourceImportCatalog.ResourceElement = {
  kind: 'directory-resource',
  resourceId: 'directory-id',
  id: 'workspace',
  permissions: { access: 'read', deleteFile: false, text: null, sqlite: null },
}

const sqliteResource: ResourceImportCatalog.ResourceElement = {
  kind: 'sqlite-resource',
  resourceId: 'sqlite-id',
  id: 'database',
  access: 'read-write',
  create: true,
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ClientResourcePathValidator', () => {
  it('waits 400ms after the last input before checking', async () => {
    vi.useFakeTimers()
    const updates: ClientResourcePathValidator.State[] = []
    const backend = vi.fn().mockResolvedValue({ status: 'valid' })
    const controller = ClientResourcePathValidator.create(
      (_resourceId, state) => updates.push(state),
      backend,
    )

    controller.schedule(directoryResource, 'C:\\old')
    expect(updates.at(-1)?.status).toBe('checking')
    await vi.advanceTimersByTimeAsync(200)
    controller.schedule(directoryResource, 'C:\\workspace')
    await vi.advanceTimersByTimeAsync(399)
    expect(backend).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await Promise.resolve()

    expect(backend).toHaveBeenCalledOnce()
    expect(backend).toHaveBeenCalledWith(expect.objectContaining({ path: 'C:\\workspace' }))
    expect(updates.at(-1)?.status).toBe('valid')
    controller.dispose()
  })

  it('ignores a result that belongs to an older path', async () => {
    let resolveFirst: ((value: { status: 'valid' }) => void) | undefined
    let resolveSecond: ((value: { status: 'not-found' }) => void) | undefined
    const backend = vi.fn()
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))
    const updates: ClientResourcePathValidator.State[] = []
    const controller = ClientResourcePathValidator.create(
      (_resourceId, state) => updates.push(state),
      backend,
    )

    const first = controller.checkNow(directoryResource, 'C:\\old')
    const second = controller.checkNow(directoryResource, 'C:\\current')
    resolveSecond?.({ status: 'not-found' })
    await expect(second).resolves.toMatchObject({ path: 'C:\\current', status: 'not-found' })
    resolveFirst?.({ status: 'valid' })
    await expect(first).resolves.toBeNull()

    expect(updates.at(-1)).toMatchObject({ path: 'C:\\current', status: 'not-found' })
    controller.dispose()
  })

  it('allows a missing writable SQLite file to be created', () => {
    expect(ClientResourcePathValidator.createRequest(sqliteResource, 'C:\\data\\app.db'))
      .toEqual({ path: 'C:\\data\\app.db', expectedKind: 'file', allowMissingFile: true })
    expect(ClientResourcePathValidator.isAccepted({
      path: 'C:\\data\\app.db',
      status: 'creatable',
    })).toBe(true)
  })
})
