import type { CommandContext, CommandDefinition } from '../command-types'
import createRunCatalog from '../catalog/run-catalog'

namespace AppProvider {
  export const create = () => ({
    getCatalogs: (_context: CommandContext): CommandDefinition[] => [createRunCatalog()],
  })
}

export default AppProvider
