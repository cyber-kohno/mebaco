import type TreeNode from '../tree/tree-node'

export type CommandTone = 'normal' | 'success' | 'warning' | 'danger'
export type CommandOutputKind = 'command' | 'log'

export type CommandOutput = {
  id: number
  kind: CommandOutputKind
  tone: CommandTone
  message: string
}

export type CommandContext = {
  rootNode: TreeNode.Node
  selectedNodeId: number
  appendOutput: (tone: CommandTone, message: string) => void
  close: () => void
  openPreview: (launcherId?: string, launchValues?: Readonly<Record<string, unknown>>) => boolean
  requestChoice: (
    message: string,
    choices: readonly CommandChoice[],
    onSelect: (choiceId: string) => void | Promise<void>,
  ) => void
  requestInput: (
    message: string,
    spec: CommandInputSpec,
    onSubmit: (value: string) => void | Promise<void>,
  ) => void
}

export type CommandDefinition = {
  id: string
  label: string
  description: string
  aliases?: readonly string[]
  isAvailable?: (context: CommandContext) => boolean
  complete?: (context: CommandContext, args: readonly string[]) => readonly CommandCompletion[]
  execute: (context: CommandContext, args: readonly string[]) => void | Promise<void>
}

export type CommandSuggestion = {
  definition: CommandDefinition
  score: number
  label?: string
  description?: string
  insertText?: string
}

export type CommandCompletion = {
  label: string
  detail?: string
  insertText: string
}

export type CommandChoice = {
  id: string
  label: string
  detail?: string
}

export type CommandInputSpec = {
  kind: 'string' | 'number' | 'boolean'
  placeholder?: string
}

export type CommandPrompt = {
  message: string
  choices: CommandChoice[]
  focus: number
  onSelect: (choiceId: string) => void | Promise<void>
  inputValue?: string
  inputSpec?: CommandInputSpec
  onInputSubmit?: (value: string) => void | Promise<void>
}

export type CommandSession = {
  nodeId: number
  input: string
  completionDismissed: boolean
  focus: number
  outputs: CommandOutput[]
  prompt: CommandPrompt | null
}
