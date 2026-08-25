import type { CommandContext, CommandDefinition } from '../command-types'
import createClearCatalog from '../catalog/clear-catalog'
import createSaveCatalog from '../catalog/save-catalog'
import createVerifyCatalog from '../catalog/verify-catalog'

const createProjectProvider = () => ({
  getCatalogs: (_context: CommandContext): CommandDefinition[] => [
    createClearCatalog(),
    createSaveCatalog(),
    createVerifyCatalog(),
  ],
})

export default createProjectProvider
