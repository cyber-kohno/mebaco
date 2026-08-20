import type TreeNode from '../tree/tree-node'

export type CommandTone = 'normal' | 'success' | 'warning' | 'danger'

export type CommandOutput = {
  id: number
  tone: CommandTone
  message: string
}

export type CommandContext = {
  rootNode: TreeNode.Node
  selectedNodeId: number
  appendOutput: (tone: CommandTone, message: string) => void
  close: () => void
  openPreview: () => boolean
}

export type CommandDefinition = {
  id: string
  label: string
  description: string
  aliases?: readonly string[]
  isAvailable?: (context: CommandContext) => boolean
  execute: (context: CommandContext, args: readonly string[]) => void | Promise<void>
}

export type CommandSuggestion = {
  definition: CommandDefinition
  score: number
}

export type CommandSession = {
  input: string
  focus: number
  outputs: CommandOutput[]
}

export default CommandDefinition
