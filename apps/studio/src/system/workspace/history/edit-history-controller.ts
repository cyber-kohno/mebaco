import { get } from 'svelte/store'
import type TreeNode from '@system/model/tree/tree-node'
import TauriEditHistory from '@system/infra/tauri/edit-history'
import TreeStore from '@system/workspace/tree/state'
import TreeViewportController from '@system/workspace/tree/tree-viewport-controller'
import EditHistoryLog from './edit-history-log'
import McpEditSessionState from '@system/mcp/mcp-edit-session-state'
import McpUserEditGuard from '@system/mcp/mcp-user-edit-guard'

namespace EditHistoryController {
  type Snapshot = {
    rootNode: TreeNode.Node
    selectedNodeId: number
    viewRootNodeId: number | null
  }

  let queue: Promise<void> = Promise.resolve()
  let checkpointLog: { checkoutId: string; entries: readonly EditHistoryLog.Entry[]; startedRevision: number; changed: boolean } | null = null

  const runSerialized = <Result>(operation: () => Promise<Result>): Promise<Result> => {
    const result = queue.then(operation, operation)
    queue = result.then(() => undefined, () => undefined)
    return result
  }

  const createSnapshot = (
    rootNode = get(TreeStore.rootNode),
    selectedNodeId = get(TreeStore.selectedNodeId),
    viewRootNodeId = get(TreeViewportController.state).viewRootNodeId,
  ): Snapshot => ({ rootNode, selectedNodeId, viewRootNodeId })

  const serialize = (snapshot: Snapshot): string => JSON.stringify(snapshot)

  const parse = (source: string): Snapshot => {
    const value = JSON.parse(source) as Partial<Snapshot>
    if (
      value.rootNode == null
      || typeof value.rootNode !== 'object'
      || typeof value.selectedNodeId !== 'number'
      || (
        value.viewRootNodeId !== null
        && typeof value.viewRootNodeId !== 'number'
      )
    ) throw new Error('The edit history snapshot returned by Studio is invalid.')
    return value as Snapshot
  }

  const restoreSnapshot = (snapshot: Snapshot, source: 'undo' | 'redo') => {
    TreeStore.restoreHistorySnapshot(
      snapshot.rootNode,
      snapshot.selectedNodeId,
      source,
    )
    const rootNode = get(TreeStore.rootNode)
    TreeViewportController.setViewRootNodeId(rootNode, snapshot.viewRootNodeId)
    TreeViewportController.requestReveal(get(TreeStore.selectedNodeId))
    EditHistoryLog.updateLatestViewRootNodeId(snapshot.viewRootNodeId)
  }

  const reportFailure = (operation: string, error: unknown) => {
    console.error(`Failed to ${operation} edit history.`, error)
  }

  export const connect = (): (() => void) => {
    let beforeSnapshot: Snapshot | null = null
    EditHistoryLog.initialize(
      get(TreeStore.rootNode),
      get(TreeStore.selectedNodeId),
      get(TreeViewportController.state).viewRootNodeId,
    )
    void runSerialized(() => TauriEditHistory.clear())
      .catch((error) => reportFailure('initialize', error))

    const unsubscribeStart = TreeStore.onTransactionStart((start) => {
      if (start.options.source === 'mcp' && start.options.checkoutId === checkpointLog?.checkoutId) { beforeSnapshot = null; return }
      beforeSnapshot = createSnapshot(
        start.rootNode,
        start.selectedNodeId,
        get(TreeViewportController.state).viewRootNodeId,
      )
    })
    const unsubscribeTransaction = TreeStore.onTransaction((commit) => {
      if (commit.options.source === 'mcp' && commit.options.checkoutId === checkpointLog?.checkoutId) {
        const group = checkpointLog!
        group.changed = true
        beforeSnapshot = null
        EditHistoryLog.recordAgentGroup(group.entries, group.startedRevision, commit, get(TreeViewportController.state).viewRootNodeId)
        return
      }
      EditHistoryLog.record(commit, get(TreeViewportController.state).viewRootNodeId)
      if (commit.options.source === 'undo' || commit.options.source === 'redo' || commit.options.source === 'rollback') {
        beforeSnapshot = null
        return
      }
      const snapshot = beforeSnapshot ?? createSnapshot(
        commit.previousRootNode,
        commit.previousSelectedNodeId,
      )
      beforeSnapshot = null
      void runSerialized(() => TauriEditHistory.record(serialize(snapshot)))
        .catch((error) => reportFailure('record', error))
    })
    const unsubscribeLifecycle = TreeStore.onLifecycle((event) => {
      if (event.type !== 'replace') return
      beforeSnapshot = null
      checkpointLog = null
      EditHistoryLog.initialize(
        get(TreeStore.rootNode),
        get(TreeStore.selectedNodeId),
        get(TreeViewportController.state).viewRootNodeId,
      )
      void runSerialized(() => TauriEditHistory.clear())
        .catch((error) => reportFailure('clear', error))
    })

    // Unexpected session reset abandons the checkpoint without changing the live tree.
    // Normal checkin/cancel already consume it before clearing the owner.
    const unsubscribeOwner = McpEditSessionState.store.subscribe((owner) => {
      const stale = checkpointLog
      if (stale == null || owner?.checkoutId === stale.checkoutId) return
      checkpointLog = null
      void runSerialized(() => TauriEditHistory.commitCheckpoint(stale.checkoutId, stale.changed))
        .catch((error) => reportFailure('discard abandoned checkpoint', error))
    })

    return () => {
      unsubscribeStart()
      unsubscribeTransaction()
      unsubscribeLifecycle()
      unsubscribeOwner()
    }
  }

  export const undo = (): Promise<boolean> => runSerialized(async () => {
    if (!McpUserEditGuard.allows()) return false
    const end = McpEditSessionState.beginUserOperation()
    try {
      const snapshot = await TauriEditHistory.undo(serialize(createSnapshot()))
      if (snapshot == null) return false
      restoreSnapshot(parse(snapshot), 'undo')
      return true
    } finally { end() }
  }).catch((error) => {
    reportFailure('undo', error)
    return false
  })

  export const redo = (): Promise<boolean> => runSerialized(async () => {
    if (!McpUserEditGuard.allows()) return false
    const end = McpEditSessionState.beginUserOperation()
    try {
      const snapshot = await TauriEditHistory.redo(serialize(createSnapshot()))
      if (snapshot == null) return false
      restoreSnapshot(parse(snapshot), 'redo')
      return true
    } finally { end() }
  }).catch((error) => {
    reportFailure('redo', error)
    return false
  })

  export const restore = (revision: number): Promise<boolean> => runSerialized(async () => {
    if (!McpUserEditGuard.allows()) return false
    const entry = EditHistoryLog.getEntry(revision)
    if (entry == null) return false

    const currentRootNode = get(TreeStore.rootNode)
    const currentSelectedNodeId = get(TreeStore.selectedNodeId)
    const currentViewRootNodeId = get(TreeViewportController.state).viewRootNodeId
    if (
      currentRootNode === entry.snapshot.rootNode
      && currentSelectedNodeId === entry.snapshot.selectedNodeId
      && currentViewRootNodeId === entry.snapshot.viewRootNodeId
    ) return false

    TreeStore.restoreHistorySnapshot(
      entry.snapshot.rootNode,
      entry.snapshot.selectedNodeId,
      'restore',
      `Restore history #${entry.revision}`,
    )
    const rootNode = get(TreeStore.rootNode)
    TreeViewportController.setViewRootNodeId(rootNode, entry.snapshot.viewRootNodeId)
    TreeViewportController.requestReveal(get(TreeStore.selectedNodeId))
    EditHistoryLog.updateLatestViewRootNodeId(entry.snapshot.viewRootNodeId)
    return true
  }).catch((error) => {
    reportFailure('restore', error)
    return false
  })

  export const getEntries = (): readonly EditHistoryLog.Entry[] => EditHistoryLog.getEntries()

  export const createCheckpoint = (checkoutId: string): Promise<void> => {
    // Capture immediately under the checkout lock, before awaiting queued history I/O.
    const snapshot = serialize(createSnapshot())
    const entries = EditHistoryLog.getEntries()
    const startedRevision = get(TreeStore.revision)
    return runSerialized(async () => {
      McpEditSessionState.assertCheckout(checkoutId, undefined, true, true)
      await TauriEditHistory.createCheckpoint(checkoutId, snapshot)
      try { McpEditSessionState.assertCheckout(checkoutId, undefined, true, true) }
      catch (error) { await TauriEditHistory.finishCheckpoint(checkoutId, false); throw error }
      checkpointLog = { checkoutId, entries, startedRevision, changed: false }
    })
  }

  export const discardCheckpoint = (checkoutId: string): Promise<void> => runSerialized(async () => {
    McpEditSessionState.assertCheckout(checkoutId, undefined, true, true)
    const changed = checkpointLog?.checkoutId === checkoutId && checkpointLog.changed
    await TauriEditHistory.commitCheckpoint(checkoutId, changed)
    if (changed && checkpointLog != null) {
      const rootNode = get(TreeStore.rootNode)
      const selectedNodeId = get(TreeStore.selectedNodeId)
      EditHistoryLog.recordAgentGroup(checkpointLog.entries, checkpointLog.startedRevision, {
        options: { source: 'mcp', label: 'Agent work' }, rootNode,
        previousRootNode: checkpointLog.entries.at(-1)?.snapshot.rootNode ?? rootNode,
        selectedNodeId, previousSelectedNodeId: selectedNodeId,
        previousRevision: checkpointLog.startedRevision, revision: get(TreeStore.revision), lifecycleEvents: [],
      }, get(TreeViewportController.state).viewRootNodeId)
    }
    if (checkpointLog?.checkoutId === checkoutId) checkpointLog = null
  })

  export const rollbackCheckpoint = (checkoutId: string, expectedRevision: number): Promise<void> => runSerialized(async () => {
    const snapshot = parse(await TauriEditHistory.getCheckpoint(checkoutId))
    // Revalidate after native I/O and before publishing the restored tree.
    McpEditSessionState.assertCheckout(checkoutId, undefined, true, true)
    TreeStore.restoreHistorySnapshot(snapshot.rootNode, snapshot.selectedNodeId, 'rollback', 'Cancel agent work', { checkoutId, expectedRevision })
    const rootNode = get(TreeStore.rootNode)
    TreeViewportController.setViewRootNodeId(rootNode, snapshot.viewRootNodeId)
    TreeViewportController.requestReveal(get(TreeStore.selectedNodeId))
    EditHistoryLog.updateLatestViewRootNodeId(snapshot.viewRootNodeId)
    // Consume only after a successful tree restore. Failures retain the owner/checkpoint.
    await TauriEditHistory.finishCheckpoint(checkoutId, true)
    if (checkpointLog?.checkoutId === checkoutId) {
      EditHistoryLog.restoreEntries(checkpointLog.entries, EditHistoryLog.getEntries().at(-1))
      checkpointLog = null
    }
  })
}

export default EditHistoryController
