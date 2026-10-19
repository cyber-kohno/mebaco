import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import { ProjectTreeFactory } from '@system/project/tree-factory'
import TreeNode from '@system/model/tree/tree-node'
import TreeStore from '@system/workspace/tree/state'
import McpEditSessionState from './mcp-edit-session-state'
import McpSessionState from './mcp-session-state'

const bridge = vi.hoisted(() => ({ onRequest: vi.fn(), respond: vi.fn() }))
vi.mock('@system/infra/tauri/mcp', () => ({ default: bridge }))
vi.mock('@system/infra/tauri/edit-history', () => ({ default: { createCheckpoint: vi.fn(), finishCheckpoint: vi.fn() } }))
vi.mock('@system/ui/feedback/confirm/confirm-dialog-controller', () => ({ default: { openNotice: vi.fn() } }))
vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: { show: vi.fn() } }))
vi.mock('@system/application/validation/expression', () => ({ ExpressionVerificationRunner: { verify: vi.fn() } }))
vi.mock('@system/project/project-session-store', () => ({ default: { store: { subscribe: (run: (value: unknown) => void) => { run({ isDirty: true, savedFingerprint: 'saved' }); return () => {} } } } }))

import McpToolHandler from './mcp-tool-handler'

describe('MCP checkout with the real TreeStore', () => {
  let handle: (request: any) => Promise<void>
  let disconnect: (() => void) | undefined
  beforeEach(async () => {
    vi.clearAllMocks()
    McpEditSessionState.reset()
    TreeStore.replaceRoot(ProjectTreeFactory.createRootNode())
    McpSessionState.set('available')
    McpSessionState.detailsStore.set({ sessionId: 'integration-session', endpoint: 'http://127.0.0.1:12345', pid: 123 })
    bridge.onRequest.mockImplementation((handler) => { handle = handler; return Promise.resolve(vi.fn()) })
    bridge.respond.mockResolvedValue(undefined)
    disconnect = await McpToolHandler.connect()
  })
  afterEach(() => { disconnect?.(); McpEditSessionState.reset() })

  it('rolls back an incomplete App creation and returns a structured error', async () => {
    const root = get(TreeStore.rootNode)
    const selected = get(TreeStore.selectedNodeId)
    const commit = vi.fn()
    const off = TreeStore.onTransaction(commit)
    const draft = vi.spyOn(TreeStore, 'getCurrentRoot').mockReturnValue(root)
    try {
      const { checkoutId } = McpEditSessionState.checkout('integration-session', 0)
      await handle({ id: 'invalid-app', method: 'createApplication', params: { checkoutId, expectedRevision: 0, appName: 'invalid-app' } })
      expect(bridge.respond).toHaveBeenLastCalledWith({ id: 'invalid-app', error: expect.objectContaining({ code: 'PROJECT_STRUCTURE_INVALID' }) })
      expect(get(TreeStore.rootNode)).toBe(root)
      expect(get(TreeStore.selectedNodeId)).toBe(selected)
      expect(get(TreeStore.revision)).toBe(0)
      expect(commit).not.toHaveBeenCalled()
      expect(get(McpEditSessionState.store)?.checkoutId).toBe(checkoutId)
    } finally { draft.mockRestore(); off() }
  })

  it('creates App, Main and entry in one owner transaction rather than locked user mutations', async () => {
    const roots: TreeNode.Node[] = []
    const offRoot = TreeStore.rootNode.subscribe((root) => roots.push(root))
    const committed = vi.fn()
    const offCommit = TreeStore.onTransaction(committed)
    try {
      await handle({ id: 'checkout', method: 'checkoutEditSession', params: { expectedRevision: 0 } })
      const checkoutId = get(McpEditSessionState.store)!.checkoutId
      expect(bridge.respond).toHaveBeenLastCalledWith({ id: 'checkout', result: expect.objectContaining({ editingLocked: true }) })
      await handle({ id: 'preview', method: 'createApplication', params: { checkoutId, expectedRevision: 0, appName: 'new-app', dryRun: true } })
      expect(get(TreeStore.revision)).toBe(0)
      expect(roots).toHaveLength(1)
      await handle({ id: 'create', method: 'createApplication', params: { checkoutId, expectedRevision: 0, appName: 'new-app' } })
      const response = bridge.respond.mock.calls.at(-1)![0]
      expect(response).toMatchObject({ id: 'create', result: { changed: true, previousRevision: 0, revision: 1 } })
      const { appNodeId, mainNodeId, componentId, entryNodeId } = response.result.application
      const root = get(TreeStore.rootNode)
      expect(TreeNode.findNode(root, appNodeId)?.element).toMatchObject({ kind: 'app', id: 'new-app' })
      expect(TreeNode.findNode(root, mainNodeId)?.element).toMatchObject({ kind: 'component', id: 'Main', componentId })
      expect(TreeNode.findNode(root, entryNodeId)?.element).toMatchObject({ kind: 'entry', componentId })
      expect(committed).toHaveBeenCalledOnce()
      expect(committed.mock.calls[0]![0].options).toMatchObject({ source: 'mcp', checkoutId })
      expect(roots).toHaveLength(2)
      expect(() => TreeStore.toggleDisabled(mainNodeId)).toThrowError(McpEditSessionState.Error)
    } finally { offRoot(); offCommit() }
  })
})
