import { get } from 'svelte/store'
import EditHistoryLog from '@system/workspace/history/edit-history-log'
import { EditHistoryController } from '@system/workspace/history/controller'
import TreeStore from '@system/workspace/tree/state'
import type { CommandContext, CommandDefinition } from '../command-types'

const sourceLabels: Record<EditHistoryLog.Entry['source'], string> = {
  user: 'User',
  mcp: 'Agent/MCP',
  undo: 'Undo',
  redo: 'Redo',
  restore: 'Restore',
  system: 'System',
}

const changeLabels: Record<EditHistoryLog.ChangeType, string> = {
  added: 'added',
  removed: 'removed',
  updated: 'updated',
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleTimeString()
}

const formatEntry = (entry: EditHistoryLog.Entry): string => {
  const changes = entry.changedNodes.length === 0
    ? '  - tree change'
    : entry.changedNodes.slice(0, 20).map((node) => (
      `  - node-${node.nodeId} (${node.kind}): ${changeLabels[node.change]}`
    )).join('\n')
  const omitted = entry.changedNodes.length > 20
    ? `\n  - ...and ${entry.changedNodes.length - 20} more node(s)`
    : ''
  return `History #${entry.revision} [${sourceLabels[entry.source]}] ${formatTimestamp(entry.timestamp)}\n${entry.label}\n${changes}${omitted}`
}

const parseRevision = (value: string | undefined): number | null => {
  if (value == null || !/^\d+$/.test(value)) return null
  const revision = Number(value)
  return Number.isSafeInteger(revision) ? revision : null
}

const createHistoryCatalog = (): CommandDefinition => ({
  id: 'history',
  label: 'history',
  description: 'Show the current session change history.',
  complete: (_context, args) => args.length <= 1
    ? [{ label: 'restore', detail: 'Restore a previous history entry.', insertText: 'history restore' }]
    : [],
  execute: (context: CommandContext, args: readonly string[]) => {
    if (
      args.length === 1
      || args.length > 2
      || args[0] !== 'restore'
      || parseRevision(args[1]) == null
    ) {
      if (args.length === 0) {
        const entries = EditHistoryLog.getEntries()
        if (entries.length === 0) {
          context.appendOutput('normal', `No committed changes in this session. Current history: #${get(TreeStore.revision)}.`)
          return
        }
        const message = [`Current history: #${get(TreeStore.revision)}`, ...entries.map(formatEntry)].join('\n\n')
        context.appendOutput('normal', message)
        return
      }
      context.appendOutput('warning', 'Usage: history [restore <history-number>]')
      return
    }

    const requestedRevision = parseRevision(args[1])
    const entries = EditHistoryLog.getEntries()
    if (requestedRevision != null) {
      const entry = entries.find((candidate) => candidate.revision === requestedRevision)
      if (entry == null) {
        context.appendOutput('warning', `History #${requestedRevision} was not found in this session.`)
        return
      }
      context.requestChoice(
        `Restore History #${requestedRevision}? The current state will be replaced.`,
        [
          { id: 'restore', label: 'Restore' },
          { id: 'cancel', label: 'Cancel' },
        ],
        async (choiceId) => {
          if (choiceId === 'cancel') {
            context.appendOutput('normal', 'History restore cancelled.')
            return
          }
          const restored = await EditHistoryController.restore(requestedRevision)
          context.appendOutput(
            restored ? 'success' : 'warning',
            restored
              ? `Restored History #${requestedRevision}. A new history entry was created.`
              : `History #${requestedRevision} could not be restored.`,
          )
        },
      )
      return
    }
  },
})

export default createHistoryCatalog
