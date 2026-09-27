import McpSessionController from '@system/mcp/mcp-session-controller'
import type { CommandContext, CommandDefinition, CommandTone } from '../command-types'

const getTone = (outcome: 'changed' | 'unchanged' | 'rejected'): CommandTone => {
  if (outcome === 'changed') return 'success'
  if (outcome === 'rejected') return 'warning'
  return 'normal'
}

const createMcpCatalog = (): CommandDefinition => ({
  id: 'mcp',
  label: 'mcp',
  description: 'Control the MCP development session for the current project.',
  complete: (_context, args) => args.length > 1 ? [] : [
    { label: 'start', detail: 'Make the current project available to MCP.', insertText: 'mcp start' },
    { label: 'stop', detail: 'Stop the MCP development session.', insertText: 'mcp stop' },
    { label: 'status', detail: 'Show the MCP development session status.', insertText: 'mcp status' },
  ],
  execute: async (context: CommandContext, args: readonly string[]) => {
    if (args.length !== 1 || !['start', 'stop', 'status'].includes(args[0])) {
      context.appendOutput('warning', 'Usage: mcp <start|stop|status>')
      return
    }

    if (args[0] === 'status') {
      const status = McpSessionController.getStatus()
      const details = McpSessionController.getDetails()
      const detailMessage = details == null
        ? ''
        : `\nSession ID: ${details.sessionId}\nEndpoint: ${details.endpoint}\nPID: ${details.pid}`
      context.appendOutput('normal', `MCP development session: ${status}.${detailMessage}`)
      return
    }

    const result = args[0] === 'start'
      ? await McpSessionController.start()
      : await McpSessionController.stop()
    context.appendOutput(getTone(result.outcome), result.message)
  },
})

export default createMcpCatalog
