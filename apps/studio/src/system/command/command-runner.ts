import { get } from 'svelte/store'
import TreeStore from '../store/tree-store'
import PreviewController from '../runtime/preview/preview-controller'
import CommandRegistry from './command-registry'
import CommandContextFactory from './command-context'
import { commandSessionStore } from './command-session-store'
import type { CommandContext, CommandOutput, CommandTone } from './command-types'

namespace CommandRunner {
  let outputId = 0

  const tokenize = (input: string): string[] => input.trim().match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g)?.map((token) => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1)
    }
    return token
  }) ?? []

  export const createContext = (): CommandContext => CommandContextFactory.create({
    rootNode: get(TreeStore.rootNode),
    selectedNodeId: get(TreeStore.selectedNodeId),
    appendOutput: (tone: CommandTone, message: string) => {
      const output: CommandOutput = { id: ++outputId, tone, message }
      commandSessionStore.update((session) => session == null ? session : ({ ...session, outputs: [...session.outputs, output] }))
    },
    close: () => commandSessionStore.set(null),
    openPreview: () => PreviewController.openForSelectedNode(
      get(TreeStore.rootNode),
      get(TreeStore.selectedNodeId),
    ),
  })

  export const execute = async (input: string): Promise<void> => {
    const tokens = tokenize(input)
    if (tokens.length === 0) return

    const context = createContext()
    const definition = CommandRegistry.find(context, tokens[0])
    if (definition == null) {
      context.appendOutput('warning', `Unknown command: ${tokens[0]}`)
      return
    }

    commandSessionStore.update((session) => session == null ? session : ({ ...session, input: '' }))
    try {
      await definition.execute(context, tokens.slice(1))
    } catch (error) {
      console.error(`Command failed: ${definition.id}`, error)
      context.appendOutput('danger', `Command failed: ${definition.id}`)
    }
  }

}

export default CommandRunner
