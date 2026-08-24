import type { CommandContext, CommandDefinition } from '../command-types'
import createClearCatalog from '../catalog/clear-catalog'
import createSaveCatalog from '../catalog/save-catalog'

const createProjectProvider = () => ({
  getCatalogs: (_context: CommandContext): CommandDefinition[] => [
    createClearCatalog(),
    createSaveCatalog(),
  ],
})

export default createProjectProvider
