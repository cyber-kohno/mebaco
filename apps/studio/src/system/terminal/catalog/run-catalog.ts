import type { CommandContext, CommandDefinition } from '../command-types'
import type { CommandInputSpec } from '../command-types'

export type LaunchArgumentSpec = CommandInputSpec & {
  id: string
  nullable: boolean
  literals?: readonly (string | number)[]
  structured: boolean
}

type Launcher = { id: string; name: string }

const createRunCatalog = (options: {
  hasLaunchArguments: boolean
  hasStructuredArguments: boolean
  arguments: readonly LaunchArgumentSpec[]
  launchers: readonly Launcher[]
  configurationError?: string
}): CommandDefinition => ({
  id: 'run',
  label: 'run',
  description: 'Start preview for the selected App.',
  aliases: ['preview'],
  complete: (_context, args) => options.launchers.map((launcher) => ({
    label: launcher.id,
    detail: launcher.name,
    insertText: `run ${launcher.id}`,
  })),
  execute: (context: CommandContext, args) => {
    if (options.configurationError != null) {
      context.appendOutput('danger', `App configuration error: ${options.configurationError}`)
      return
    }
    const launcherId = args[0]?.trim()
    if (launcherId != null && launcherId.length > 0) {
      const launcher = options.launchers.find((candidate) => candidate.id === launcherId)
      if (launcher == null) {
        context.appendOutput('danger', `Launcher not found: ${launcherId}`)
        return
      }
      if (context.openPreview(launcher.id)) {
        context.close()
      }
      return
    }
    if (options.hasLaunchArguments) {
      const openLauncherChoice = () => context.requestChoice(
        'Select a launcher:',
        options.launchers.map((launcher) => ({
          id: launcher.id,
          label: launcher.id,
          detail: launcher.name,
        })),
        (selectedLauncherId) => {
          if (context.openPreview(selectedLauncherId)) context.close()
        },
      )

      if (options.hasStructuredArguments) {
        if (options.launchers.length > 0) {
          openLauncherChoice()
        } else {
          context.appendOutput('danger', 'Object or array launch arguments require a registered launcher.')
        }
        return
      }

      const requestDirectArguments = (index: number, values: Record<string, unknown>) => {
        const argument = options.arguments[index]
        if (argument == null) {
          if (context.openPreview(undefined, values)) context.close()
          return
        }
        context.requestInput(
          `Enter ${argument.id} (${argument.kind})${argument.nullable ? ' (optional)' : ''}:`,
          { kind: argument.kind, placeholder: argument.literals?.join(' | ') },
          (rawValue) => {
            const parsed = parseArgumentValue(argument, rawValue)
            if (!parsed.ok) {
              context.appendOutput('danger', parsed.message)
              requestDirectArguments(index, values)
              return
            }
            requestDirectArguments(index + 1, { ...values, [argument.id]: parsed.value })
          },
        )
      }

      if (options.launchers.length > 0) {
        context.requestChoice(
          'How should this App be started?',
          [
            { id: 'launcher', label: 'Use registered launcher' },
            { id: 'direct', label: 'Enter arguments directly' },
          ],
          (mode) => {
            if (mode === 'launcher') {
              context.appendOutput('normal', 'Selected: Use registered launcher')
              openLauncherChoice()
              return
            }
            context.appendOutput('normal', 'Selected: Enter arguments directly')
            requestDirectArguments(0, {})
          },
        )
      } else {
        requestDirectArguments(0, {})
      }
      return
    }
    if (context.openPreview()) {
      context.close()
    }
  },
})

const parseArgumentValue = (
  argument: LaunchArgumentSpec,
  rawValue: string,
): { ok: true; value: unknown } | { ok: false; message: string } => {
  const value = rawValue.trim()
  if (value.length === 0 && argument.nullable) return { ok: true, value: null }
  if (value.length === 0) return { ok: false, message: `${argument.id} is required.` }

  let parsed: string | number | boolean
  if (argument.kind === 'number') {
    parsed = Number(value)
    if (!Number.isFinite(parsed)) return { ok: false, message: `${argument.id} must be a number.` }
  } else if (argument.kind === 'boolean') {
    if (value !== 'true' && value !== 'false') return { ok: false, message: `${argument.id} must be true or false.` }
    parsed = value === 'true'
  } else {
    parsed = rawValue
  }

  if (argument.literals != null && !argument.literals.some((literal) => literal === parsed)) {
    return { ok: false, message: `${argument.id} must be one of: ${argument.literals.join(', ')}.` }
  }
  return { ok: true, value: parsed }
}

export default createRunCatalog
