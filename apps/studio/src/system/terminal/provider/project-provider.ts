import type { CommandContext, CommandDefinition } from '../command-types'
import createSaveCatalog from '../catalog/save-catalog'

const createProjectProvider = () => ({
  getCatalogs: (_context: CommandContext): CommandDefinition[] => [
    createSaveCatalog(),
  ],
})

export default createProjectProvider
