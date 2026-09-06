import type { CommandContext, CommandDefinition } from '../command-types'
import type BundleElement from '../../element/kind/release/bundle-element'
import ReleasePackage from '../../release/release-package'
import { get } from 'svelte/store'
import { developScreenStore } from '../../area/develop/develop-screen-store'
import { appAreaStore } from '../../navigation/app-area-store'

const collectBundles = (
  context: CommandContext,
): BundleElement.Element[] => {
  const result: BundleElement.Element[] = []
  const visit = (node: CommandContext['rootNode']) => {
    if (node.element.kind === 'bundle') result.push(node.element)
    node.children.forEach(visit)
  }
  visit(context.rootNode)
  return result
}

const createReleaseCatalog = (): CommandDefinition => ({
  id: 'release',
  label: 'release',
  description: 'Export a Bundle as a Mebaco Application Package.',
  isAvailable: () => (
    get(appAreaStore) === 'develop'
    && get(developScreenStore) === 'workspace'
  ),
  complete: (context, args) => {
    if (args.length > 1) return []
    return collectBundles(context).map((bundle) => ({
      label: bundle.id,
      detail: `${bundle.launcherIds.length} Launcher${bundle.launcherIds.length === 1 ? '' : 's'}`,
      insertText: `release ${bundle.id}`,
    }))
  },
  execute: async (context, args) => {
    if (args.length !== 1 || args[0].trim().length === 0) {
      context.appendOutput('warning', 'Usage: release <bundle-id>')
      return
    }
    const bundleId = args[0].trim()
    const bundle = collectBundles(context).find((candidate) => candidate.id === bundleId)
    if (bundle == null) {
      context.appendOutput('danger', `Bundle not found: ${bundleId}`)
      return
    }

    context.appendOutput('normal', `Validating Bundle '${bundle.id}'...`)
    try {
      const result = await ReleasePackage.save(context.rootNode, bundle)
      if (result.status === 'cancelled') {
        context.appendOutput('normal', 'Release cancelled.')
        return
      }
      if (result.status === 'invalid') {
        result.errors.forEach((error) => context.appendOutput('danger', error))
        context.appendOutput('danger', `Release failed with ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}.`)
        return
      }
      context.appendOutput('success', `Release package saved as ${result.fileName}.`)
    } catch (error) {
      context.appendOutput(
        'danger',
        error instanceof Error ? `Release failed: ${error.message}` : 'Release failed.',
      )
    }
  },
})

export default createReleaseCatalog
