import { get } from 'svelte/store'
import ProjectFile from '../../project/project-file'
import { screenStore } from '../../store/screen-store'
import type { CommandContext, CommandDefinition } from '../command-types'

const appendSaveResult = (context: CommandContext, result: ProjectFile.SaveResult) => {
  if (result.status === 'cancelled') {
    context.appendOutput('normal', 'Save cancelled.')
    return
  }

  if (result.status === 'unchanged') {
    context.appendOutput('normal', 'No changes to save.')
    return
  }

  if (result.mode === 'overwrite') {
    context.appendOutput('success', 'Project saved successfully.')
    return
  }

  context.appendOutput(
    'success',
    `Project saved as ${result.fileName ?? 'a new file'}.`,
  )
}

const createSaveCatalog = (): CommandDefinition => ({
  id: 'save',
  label: 'save',
  description: 'Save the current Mebaco project.',
  isAvailable: () => get(screenStore) === 'develop',
  complete: (_context, args) => {
    if (args.length > 1) return []
    return [{
      label: '--as',
      detail: 'Save as a new file.',
      insertText: 'save --as',
    }]
  },
  execute: async (context: CommandContext, args: readonly string[]) => {
    if (args.length === 0) {
      appendSaveResult(context, await ProjectFile.save())
      return
    }

    if (args.length === 1 && args[0] === '--as') {
      appendSaveResult(context, await ProjectFile.saveAs())
      return
    }

    context.appendOutput('warning', 'Usage: save [--as]')
  },
})

export default createSaveCatalog
