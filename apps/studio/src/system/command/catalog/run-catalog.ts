import type { CommandContext, CommandDefinition } from '../command-types'

const createRunCatalog = (): CommandDefinition => ({
  id: 'run',
  label: 'run',
  description: 'Start preview for the selected App.',
  aliases: ['preview'],
  execute: (context: CommandContext) => {
    if (context.openPreview()) {
      context.close()
    }
  },
})

export default createRunCatalog
