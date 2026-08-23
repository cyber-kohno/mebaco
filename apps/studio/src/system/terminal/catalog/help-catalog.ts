import type { CommandContext, CommandDefinition } from '../command-types'

const createHelpCatalog = (
  getDefinitions: () => readonly CommandDefinition[],
): CommandDefinition => ({
  id: 'help',
  label: 'help',
  description: 'List available commands.',
  execute: (context: CommandContext) => {
    const commands = getDefinitions()
      .filter((definition) => definition.id !== 'help')
      .map((definition) => `${definition.id} — ${definition.description}`)
    context.appendOutput('normal', commands.length > 0 ? commands.join('\n') : 'No commands are available.')
  },
})

export default createHelpCatalog
