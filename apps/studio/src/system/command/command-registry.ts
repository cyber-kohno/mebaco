import type { CommandContext, CommandDefinition, CommandSuggestion } from './command-types'
import createHelpCatalog from './catalog/help-catalog'
import createAppProvider from './provider/app-provider'

namespace CommandRegistry {
  const getDefinitions = (context: CommandContext): CommandDefinition[] => {
    const provider = createAppProvider()
    const definitions = provider.getCatalogs(context)
    return [createHelpCatalog(() => definitions), ...definitions]
  }

  const matches = (definition: CommandDefinition, query: string): boolean => {
    const normalized = query.trim().toLowerCase()
    if (normalized === '') return true
    return [definition.id, definition.label, ...(definition.aliases ?? [])]
      .some((value) => value.toLowerCase().startsWith(normalized))
  }

  export const getAvailable = (context: CommandContext): CommandDefinition[] => (
    getDefinitions(context).filter((definition) => definition.isAvailable?.(context) ?? true)
  )

  export const getSuggestions = (
    context: CommandContext,
    query: string,
  ): CommandSuggestion[] => getAvailable(context)
    .filter((definition) => matches(definition, query))
    .map((definition) => ({
      definition,
      score: definition.id === query.trim().toLowerCase() ? 0 : 1,
    }))
    .sort((left, right) => left.score - right.score || left.definition.id.localeCompare(right.definition.id))

  export const find = (context: CommandContext, name: string): CommandDefinition | null => {
    const normalized = name.trim().toLowerCase()
    return getAvailable(context).find((definition) => (
      definition.id.toLowerCase() === normalized
      || definition.aliases?.some((alias) => alias.toLowerCase() === normalized) === true
    )) ?? null
  }
}

export default CommandRegistry
