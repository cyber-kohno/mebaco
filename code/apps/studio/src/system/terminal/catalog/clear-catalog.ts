import type { CommandContext, CommandDefinition } from '../command-types'

const createClearCatalog = (): CommandDefinition => ({
  id: 'clear',
  label: 'clear',
  description: 'Clear the terminal log.',
  execute: (context: CommandContext) => {
    context.clearOutputs()
  },
})

export default createClearCatalog
