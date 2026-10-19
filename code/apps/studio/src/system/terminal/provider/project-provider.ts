import type { CommandContext, CommandDefinition } from '../command-types'
import createClearCatalog from '../catalog/clear-catalog'
import createSaveCatalog from '../catalog/save-catalog'
import createVerifyCatalog from '../catalog/verify-catalog'
import createReleaseCatalog from '../catalog/release-catalog'
import createBuildCatalog from '../catalog/build-catalog'
import createMcpCatalog from '../catalog/mcp-catalog'
import createHistoryCatalog from '../catalog/history-catalog'

const createProjectProvider = () => ({
  getCatalogs: (_context: CommandContext): CommandDefinition[] => [
    createClearCatalog(),
    createSaveCatalog(),
    createVerifyCatalog(),
    createBuildCatalog(),
    createReleaseCatalog(),
    createMcpCatalog(),
    createHistoryCatalog(),
  ],
})

export default createProjectProvider
