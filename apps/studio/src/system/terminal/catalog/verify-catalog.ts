import type { CommandContext, CommandDefinition } from '../command-types'
import type TreeNode from '../../tree/tree-node'
import ExpressionVerificationRunner from '../../validation/expression-verification-runner'
import ExpressionSourceCatalog from '../../validation/expression-source-catalog'
import ExpressionVerificationStore from '../../validation/expression-verification-store'

const collectNodes = (
  node: TreeNode.Node,
  result: TreeNode.Node[] = [],
): TreeNode.Node[] => {
  result.push(node)
  node.children.forEach((child) => collectNodes(child, result))
  return result
}

const createVerifyCatalog = (): CommandDefinition => ({
  id: 'verify',
  label: 'verify',
  description: 'Verify expressions in the selected App.',
  execute: async (context: CommandContext) => {
    let appNode: TreeNode.Node | null = null
    const findOwnerApp = (node: TreeNode.Node, owner: TreeNode.Node | null = null): void => {
      const nextOwner = node.element.kind === 'app' ? node : owner
      if (node.id === context.selectedNodeId) {
        appNode = nextOwner
        return
      }
      for (const child of node.children) {
        if (appNode != null) return
        findOwnerApp(child, nextOwner)
      }
    }
    findOwnerApp(context.rootNode)

    if (appNode == null) {
      context.appendOutput('warning', 'Verify is available only inside an App.')
      return
    }

    const nodes = collectNodes(appNode)
    let verified = 0
    let errors = 0
    let skipped = 0

    for (const node of nodes) {
      const kind = node.element.kind
      const catalog = ExpressionSourceCatalog.collect(context.rootNode, node)
      if (!catalog.hasExpressionField) {
        skipped += 1
        context.appendOutput('normal', `node-${node.id} ${kind}: skipped (no expressions)`)
        continue
      }

      const result = await ExpressionVerificationRunner.verify(context.rootNode, node)
      if (result == null) {
        skipped += 1
        context.appendOutput('normal', `node-${node.id} ${kind}: skipped`)
        continue
      }

      ExpressionVerificationStore.setResult(node, result)
      if (result.status === 'verified') {
        verified += 1
        context.appendOutput('success', `node-${node.id} ${kind}: verified`)
      } else {
        errors += 1
        const detail = result.messages.length > 0
          ? ` — ${result.messages.join(' ')}`
          : ''
        context.appendOutput('danger', `node-${node.id} ${kind}: error${detail}`)
      }
    }

    context.appendOutput(
      errors === 0 ? 'success' : 'danger',
      `Verify summary: ${verified} verified, ${errors} error, ${skipped} skipped.`,
    )
  },
})

export default createVerifyCatalog
