import type { CommandContext, CommandDefinition, CommandSuggestion } from './command-types'
import createHelpCatalog from './catalog/help-catalog'
import createAppProvider from './provider/app-provider'
import createProjectProvider from './provider/project-provider'

namespace CommandRegistry {
  const getDefinitions = (context: CommandContext): CommandDefinition[] => {
    const definitions = [
      ...createProjectProvider().getCatalogs(context),
      ...createAppProvider().getCatalogs(context),
    ]
    return [createHelpCatalog(() => definitions), ...definitions]
  }

  const matches = (definition: CommandDefinition, query: string): boolean => {
    const normalized = query.trim().toLowerCase()
    if (normalized === '') return true
    return [definition.id, definition.label, ...(definition.aliases ?? [])]
      .some((value) => value.toLowerCase().startsWith(normalized))
  }

  const tokenize = (input: string): string[] => input.trim().match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g)?.map((token) => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1)
    }
    return token
  }) ?? []

  export const getAvailable = (context: CommandContext): CommandDefinition[] => (
    getDefinitions(context).filter((definition) => definition.isAvailable?.(context) ?? true)
  )

  export const getSuggestions = (
    context: CommandContext,
    query: string,
  ): CommandSuggestion[] => {
    const definitions = getAvailable(context)
    const tokens = tokenize(query)
    const hasArgumentInput = /^\s*\S+\s/.test(query)
    if (tokens.length === 0 || !hasArgumentInput) {
      const exactDefinition = definitions.find((definition) => (
        definition.id.toLowerCase() === (tokens[0] ?? '').toLowerCase()
        || definition.aliases?.some((alias) => alias.toLowerCase() === (tokens[0] ?? '').toLowerCase()) === true
      ))
      if (exactDefinition != null && query.trim().toLowerCase() === tokens[0].toLowerCase()) return []
      return definitions
        .filter((definition) => matches(definition, tokens[0] ?? ''))
        .map((definition) => ({
          definition,
          score: definition.id === (tokens[0] ?? '').toLowerCase() ? 0 : 1,
          label: definition.id,
          description: definition.description,
          insertText: definition.id,
        }))
        .sort((left, right) => left.score - right.score || left.definition.id.localeCompare(right.definition.id))
    }

    const command = definitions.find((definition) => (
      definition.id.toLowerCase() === tokens[0].toLowerCase()
      || definition.aliases?.some((alias) => alias.toLowerCase() === tokens[0].toLowerCase()) === true
    ))
    if (command?.complete == null) return []
    const argumentPrefix = /\s$/.test(query) ? '' : (tokens[tokens.length - 1] ?? '')
    const completions = command.complete(context, tokens.slice(1))
    if (completions.some((completion) => (
      completion.insertText.trim().toLowerCase() === query.trim().toLowerCase()
    ))) return []
    return completions
      .filter((completion) => completion.label.toLowerCase().startsWith(argumentPrefix.toLowerCase()))
      .map((completion) => ({
        definition: command,
        score: completion.label.toLowerCase() === argumentPrefix.toLowerCase() ? 0 : 1,
        label: completion.label,
        description: completion.detail ?? command.description,
        insertText: completion.insertText,
      }))
      .sort((left, right) => left.score - right.score || (left.label ?? '').localeCompare(right.label ?? ''))
  }

  export const find = (context: CommandContext, name: string): CommandDefinition | null => {
    const normalized = name.trim().toLowerCase()
    return getAvailable(context).find((definition) => (
      definition.id.toLowerCase() === normalized
      || definition.aliases?.some((alias) => alias.toLowerCase() === normalized) === true
    )) ?? null
  }
}

export default CommandRegistry
