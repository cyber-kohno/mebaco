import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writable } from 'svelte/store'
import JSZip from 'jszip'
import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../version'
import McpEditSessionState from '@system/mcp/mcp-edit-session-state'

const mocks = vi.hoisted(() => ({ clearVerification: vi.fn(), clearSession: vi.fn(), startNew: vi.fn(), markSaved: vi.fn(), markDirty: vi.fn(), replaceRoot: vi.fn(), open: vi.fn(), read: vi.fn() }))
vi.mock('@system/workspace/tree/state', () => ({ default: { rootNode: writable({ id: 1, element: { kind: 'project' }, children: [], isOpen: true }), replaceRoot: mocks.replaceRoot } }))
vi.mock('@system/project/project-session-store', () => ({ default: { store: writable({}), clear: mocks.clearSession, startNew: mocks.startNew, markSaved: mocks.markSaved, markDirty: mocks.markDirty } }))
vi.mock('@system/workspace/validation/state', () => ({ ExpressionVerificationStore: { clear: mocks.clearVerification } }))
vi.mock('../ui/native-dialog-controller', () => ({ default: { open: mocks.open } }))
vi.mock('../infra/tauri/filesystem', () => ({ default: { readBinaryFile: mocks.read } }))
vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: { show: vi.fn() } }))

import ProjectFile from './project-file'

describe('Project lifecycle edit lock', () => {
  beforeEach(() => { vi.clearAllMocks(); McpEditSessionState.reset() })
  afterEach(() => McpEditSessionState.reset())

  it('blocks New, Close and Open before clearing project state or opening a native dialog', async () => {
    McpEditSessionState.checkout('session', 0)
    expect(() => ProjectFile.startEmpty()).toThrowError(McpEditSessionState.Error)
    expect(() => ProjectFile.close()).toThrowError(McpEditSessionState.Error)
    await expect(ProjectFile.openFile()).resolves.toBe(false)
    for (const mock of [mocks.clearVerification, mocks.clearSession, mocks.startNew, mocks.replaceRoot, mocks.open, mocks.read]) expect(mock).not.toHaveBeenCalled()
  })

  it('rechecks ownership after awaiting file I/O before clearing state or replacing the tree', async () => {
    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify({ format: 'mebaco', appVersion: APP_VERSION, schemaGen: SCHEMA_GEN, apiGen: API_GEN }))
    zip.file('project.json', JSON.stringify({ rootNode: { id: 1, element: { kind: 'project', projectId: 'project' }, isOpen: true, children: [] } }))
    const bytes = await zip.generateAsync({ type: 'uint8array' })
    mocks.open.mockResolvedValue('C:\\test-only.mbc')
    let resolveRead!: (value: Uint8Array) => void
    mocks.read.mockImplementation(() => new Promise((resolve) => { resolveRead = resolve }))
    const opening = ProjectFile.openFile()
    await vi.waitFor(() => expect(mocks.read).toHaveBeenCalledOnce())
    McpEditSessionState.checkout('session', 0)
    resolveRead(bytes)
    await expect(opening).resolves.toBe(false)
    for (const mock of [mocks.clearVerification, mocks.clearSession, mocks.replaceRoot, mocks.markSaved, mocks.markDirty]) expect(mock).not.toHaveBeenCalled()
  })
})
