import type TreeNode from '../tree/tree-node'
import type { CommandContext, CommandTone } from './command-types'

namespace CommandContextFactory {
  export const create = (options: {
    rootNode: TreeNode.Node
    selectedNodeId: number
    appendOutput: (tone: CommandTone, message: string) => void
    close: () => void
    openPreview: () => boolean
  }): CommandContext => ({ ...options })
}

export default CommandContextFactory
