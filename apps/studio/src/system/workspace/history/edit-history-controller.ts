import { get } from 'svelte/store'
import type TreeNode from '@system/model/tree/tree-node'
import TauriEditHistory from '@system/infra/tauri/edit-history'
import TreeStore from '@system/workspace/tree/state'
import TreeViewportController from '@system/workspace/tree/tree-viewport-controller'
import EditHistoryLog from './edit-history-log'

namespace EditHistoryController {
  type Snapshot = {
    rootNode: TreeNode.Node
    selectedNodeId: number
    viewRootNodeId: number | null
  }

  let queue: Promise<void> = Promise.resolve()

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
      beforeSnapshot = createSnapshot(
        start.rootNode,
        start.selectedNodeId,
        get(TreeViewportController.state).viewRootNodeId,
      )
    })
    const unsubscribeTransaction = TreeStore.onTransaction((commit) => {
      EditHistoryLog.record(commit, get(TreeViewportController.state).viewRootNodeId)
      if (commit.options.source === 'undo' || commit.options.source === 'redo') {
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
      EditHistoryLog.initialize(
        get(TreeStore.rootNode),
        get(TreeStore.selectedNodeId),
        get(TreeViewportController.state).viewRootNodeId,
      )
      void runSerialized(() => TauriEditHistory.clear())
        .catch((error) => reportFailure('clear', error))
    })

    return () => {
      unsubscribeStart()
      unsubscribeTransaction()
      unsubscribeLifecycle()
    }
  }

  export const undo = (): Promise<boolean> => runSerialized(async () => {
    const snapshot = await TauriEditHistory.undo(serialize(createSnapshot()))
    if (snapshot == null) return false
    restoreSnapshot(parse(snapshot), 'undo')
    return true
  }).catch((error) => {
    reportFailure('undo', error)
    return false
  })

  export const redo = (): Promise<boolean> => runSerialized(async () => {
    const snapshot = await TauriEditHistory.redo(serialize(createSnapshot()))
    if (snapshot == null) return false
    restoreSnapshot(parse(snapshot), 'redo')
    return true
  }).catch((error) => {
    reportFailure('redo', error)
    return false
  })

  export const restore = (revision: number): Promise<boolean> => runSerialized(async () => {
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
}

export default EditHistoryController
