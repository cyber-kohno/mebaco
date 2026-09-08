import { get } from 'svelte/store'
import { appAreaStore } from '../../navigation/app-area-store'
import { developScreenStore } from '../../area/develop/develop-screen-store'
import type BundleElement from '../../element/kind/release/bundle-element'
import ReleasePackage from '../../release/release-package'
import TreeStore from '../../store/tree-store'
import type TreeNode from '../../tree/tree-node'
import type { CommandContext, CommandDefinition } from '../command-types'

type BundleNode = TreeNode.Node & { element: BundleElement.Element }

const collectBundles = (rootNode: TreeNode.Node): BundleNode[] => {
  const result: BundleNode[] = []
  const visit = (node: TreeNode.Node) => {
    if (node.element.kind === 'bundle') result.push(node as BundleNode)
    node.children.forEach(visit)
  }
  visit(rootNode)
  return result
}

const createBuildCatalog = (): CommandDefinition => ({
  id: 'build',
  label: 'build',
  description: 'Validate a Bundle and fix its content as a numbered revision.',
  isAvailable: () => get(appAreaStore) === 'develop' && get(developScreenStore) === 'workspace',
  complete: (context, args) => {
    if (args.length > 1) return []
    return collectBundles(context.rootNode).map((node) => ({
      label: node.element.id,
      detail: node.element.revision == null
        ? 'Not built'
        : `Revision ${node.element.revision.generation}`,
      insertText: `build ${node.element.id}`,
    }))
  },
  execute: async (context, args) => {
    if (args.length !== 1 || args[0].trim().length === 0) {
      context.appendOutput('warning', 'Usage: build <bundle-id>')
      return
    }
    const bundleId = args[0].trim()
    const bundleNode = collectBundles(context.rootNode)
      .find((candidate) => candidate.element.id === bundleId)
    if (bundleNode == null) {
      context.appendOutput('danger', `Bundle not found: ${bundleId}`)
      return
    }

    context.appendOutput('normal', `Building Bundle '${bundleNode.element.id}'...`)
    try {
      const candidate = await ReleasePackage.createRevisionCandidate(
        context.rootNode,
        bundleNode.element,
      )
      if ('errors' in candidate) {
        candidate.errors.forEach((error) => context.appendOutput('danger', error))
        context.appendOutput('danger', `Build failed with ${candidate.errors.length} error${candidate.errors.length === 1 ? '' : 's'}.`)
        return
      }
      const previous = bundleNode.element.revision
      if (previous?.contentHash === candidate.contentHash) {
        context.appendOutput('success', `Bundle '${bundleNode.element.id}' is already built at Revision ${previous.generation}. No changes were detected.`)
        return
      }
      const generation = (previous?.generation ?? 0) + 1
      TreeStore.updateElement(bundleNode.id, {
        ...bundleNode.element,
        revision: {
          generation,
          contentHash: candidate.contentHash,
          builtAt: new Date().toISOString(),
        },
      })
      context.appendOutput('success', `Bundle '${bundleNode.element.id}' was built as Revision ${generation}.`)
    } catch (error) {
      context.appendOutput('danger', error instanceof Error ? `Build failed: ${error.message}` : 'Build failed.')
    }
  },
})

export default createBuildCatalog
