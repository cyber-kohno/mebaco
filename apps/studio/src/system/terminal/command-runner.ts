import { get } from 'svelte/store'
import TreeStore from '../store/tree-store'
import PreviewController from '../runtime/preview/preview-controller'
import CommandRegistry from './command-registry'
import CommandContextFactory from './command-context'
import { commandSessionStore } from './command-session-store'
import type { CommandChoice, CommandContext, CommandOutput, CommandOutputKind, CommandTone } from './command-types'

namespace CommandRunner {
  let outputId = 0

  const appendRecord = (kind: CommandOutputKind, tone: CommandTone, message: string) => {
    const output: CommandOutput = { id: ++outputId, kind, tone, message }
    commandSessionStore.update((session) => session == null ? session : ({ ...session, outputs: [...session.outputs, output] }))
  }

  export const clearOutputs = () => {
    commandSessionStore.update((session) => session == null ? session : ({ ...session, outputs: [] }))
  }

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
      appendRecord('log', tone, message)
    },
    clearOutputs,
    close: () => commandSessionStore.set(null),
    openPreview: (launcherId?: string, launchValues?: Readonly<Record<string, unknown>>) => PreviewController.openForSelectedNode(
      get(TreeStore.rootNode),
      get(TreeStore.selectedNodeId),
      launcherId,
      launchValues,
    ),
    requestChoice: (
      message: string,
      choices: readonly CommandChoice[],
      onSelect: (choiceId: string) => void | Promise<void>,
    ) => {
      commandSessionStore.update((session) => session == null ? session : ({
        ...session,
        prompt: {
          message,
          choices: [...choices],
          focus: 0,
          onSelect,
        },
      }))
    },
    requestInput: (
      message,
      spec,
      onSubmit,
    ) => {
      commandSessionStore.update((session) => session == null ? session : ({
        ...session,
        prompt: {
          message,
          choices: [],
          focus: 0,
          onSelect: () => undefined,
          inputValue: '',
          inputSpec: spec,
          onInputSubmit: onSubmit,
        },
      }))
    },
  })

  export const execute = async (input: string): Promise<void> => {
    const tokens = tokenize(input)
    if (tokens.length === 0) return

    const context = createContext()
    const session = get(commandSessionStore)
    appendRecord('command', 'normal', `node-${session?.nodeId ?? get(TreeStore.selectedNodeId)}> ${input}`)
    commandSessionStore.update((session) => session == null ? session : ({ ...session, input: '', completionDismissed: false, prompt: null }))
    const definition = CommandRegistry.find(context, tokens[0])
    if (definition == null) {
      context.appendOutput('warning', `Unknown command: ${tokens[0]}`)
      return
    }

    try {
      await definition.execute(context, tokens.slice(1))
    } catch (error) {
      console.error(`Command failed: ${definition.id}`, error)
      context.appendOutput('danger', `Command failed: ${definition.id}`)
    }
  }

}

export default CommandRunner
