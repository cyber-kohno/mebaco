import { get } from 'svelte/store'
import TreeStore from '@system/workspace/tree/state'
import PreviewController from '../runtime/preview/preview-controller'
import CommandRegistry from './command-registry'
import CommandContextFactory from './command-context'
import { commandSessionStore } from './command-session-store'
import type { CommandChoice, CommandContext, CommandOutput, CommandOutputKind, CommandTone } from './command-types'

namespace CommandRunner {
  let outputId = 0

  const appendRecord = (
    kind: CommandOutputKind,
    tone: CommandTone,
    message: string,
    sessionId?: number,
  ) => {
    const output: CommandOutput = { id: ++outputId, kind, tone, message }
    commandSessionStore.update((session) => (
      session == null || (sessionId != null && session.id !== sessionId)
        ? session
        : ({ ...session, outputs: [...session.outputs, output] })
    ))
  }

  export const clearOutputs = () => {
    commandSessionStore.update((session) => session == null ? session : ({ ...session, outputs: [] }))
  }

  const finishExecution = (sessionId: number) => {
    commandSessionStore.update((session) => (
      session?.id !== sessionId || session.phase !== 'running'
        ? session
        : ({ ...session, phase: 'idle' })
    ))
  }

  const tokenize = (input: string): string[] => input.trim().match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g)?.map((token) => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1)
    }
    return token
  }) ?? []

  export const createContext = (sessionId?: number): CommandContext => CommandContextFactory.create({
    rootNode: get(TreeStore.rootNode),
    selectedNodeId: get(TreeStore.selectedNodeId),
    appendOutput: (tone: CommandTone, message: string) => {
      appendRecord('log', tone, message, sessionId)
    },
    clearOutputs: () => {
      commandSessionStore.update((session) => (
        session == null || (sessionId != null && session.id !== sessionId)
          ? session
          : ({ ...session, outputs: [] })
      ))
    },
    close: () => {
      commandSessionStore.update((session) => (
        sessionId == null || session?.id === sessionId ? null : session
      ))
    },
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
      commandSessionStore.update((session) => session == null || (sessionId != null && session.id !== sessionId) ? session : ({
        ...session,
        phase: 'awaiting-input',
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
      commandSessionStore.update((session) => session == null || (sessionId != null && session.id !== sessionId) ? session : ({
        ...session,
        phase: 'awaiting-input',
        prompt: {
          message,
          choices: [],
          focus: 0,
          onSelect: () => undefined,
          inputValue: '',
          inputCaret: 0,
          inputSpec: spec,
          onInputSubmit: onSubmit,
        },
      }))
    },
  })

  export const execute = async (input: string): Promise<void> => {
    const tokens = tokenize(input)
    if (tokens.length === 0) return

    const session = get(commandSessionStore)
    if (session == null || session.phase !== 'idle') return
    const sessionId = session.id
    const context = createContext(sessionId)
    appendRecord('command', 'normal', `node-${session.nodeId}> ${input}`, sessionId)
    commandSessionStore.update((current) => current?.id !== sessionId ? current : ({
      ...current,
      phase: 'running',
      input: '',
      inputCaret: 0,
      completionDismissed: false,
      prompt: null,
    }))
    let commandId = tokens[0]

    try {
      const definition = CommandRegistry.find(context, tokens[0])
      if (definition == null) {
        context.appendOutput('warning', `Unknown command: ${tokens[0]}`)
        return
      }
      commandId = definition.id
      await definition.execute(context, tokens.slice(1))
    } catch (error) {
      console.error(`Command failed: ${commandId}`, error)
      context.appendOutput('danger', `Command failed: ${commandId}`)
    } finally {
      finishExecution(sessionId)
    }
  }

  export const continueExecution = async (
    sessionId: number,
    callback: () => void | Promise<void>,
  ): Promise<void> => {
    try {
      await callback()
    } catch (error) {
      console.error('Command continuation failed', error)
      appendRecord('log', 'danger', 'Command failed.', sessionId)
    } finally {
      finishExecution(sessionId)
    }
  }

}

export default CommandRunner
