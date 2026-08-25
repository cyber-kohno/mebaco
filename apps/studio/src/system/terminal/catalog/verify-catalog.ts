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

const findNode = (
  node: TreeNode.Node,
  nodeId: number,
): TreeNode.Node | null => {
  if (node.id === nodeId) return node
  for (const child of node.children) {
    const found = findNode(child, nodeId)
    if (found != null) return found
  }
  return null
}

const findOwnerApp = (
  node: TreeNode.Node,
  targetNodeId: number,
  owner: TreeNode.Node | null = null,
): TreeNode.Node | null => {
  const nextOwner = node.element.kind === 'app' ? node : owner
  if (node.id === targetNodeId) return nextOwner
  for (const child of node.children) {
    const found = findOwnerApp(child, targetNodeId, nextOwner)
    if (found != null) return found
  }
  return null
}

const verifyNodes = async (
  context: CommandContext,
  nodes: readonly TreeNode.Node[],
): Promise<void> => {
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
}

const createVerifyCatalog = (): CommandDefinition => ({
  id: 'verify',
  label: 'verify',
  description: 'Verify expressions in the selected scope.',
  complete: (_context, args) => args.length > 1 ? [] : [
    { label: 'current', detail: 'Verify the selected node and its descendants.', insertText: 'verify current' },
    { label: 'project', detail: 'Verify the entire project.', insertText: 'verify project' },
  ],
  execute: async (context: CommandContext, args: readonly string[]) => {
    if (args.length > 1 || (args[0] != null && args[0] !== 'current' && args[0] !== 'project')) {
      context.appendOutput('warning', 'Usage: verify [current|project]')
      return
    }

    const selectedNode = findNode(context.rootNode, context.selectedNodeId)
    if (selectedNode == null) {
      context.appendOutput('warning', 'The selected node could not be found.')
      return
    }

    const mode = args[0]
    if (mode === 'current') {
      await verifyNodes(context, collectNodes(selectedNode))
      return
    }

    if (mode === 'project') {
      await verifyNodes(context, collectNodes(context.rootNode))
      return
    }

    const appNode = findOwnerApp(context.rootNode, context.selectedNodeId)
    if (appNode != null) {
      await verifyNodes(context, collectNodes(appNode))
      return
    }

    context.requestChoice(
      'Verify the entire project?',
      [
        { id: 'run', label: 'Run verification' },
        { id: 'cancel', label: 'Cancel' },
      ],
      async (choiceId) => {
        if (choiceId === 'cancel') {
          context.appendOutput('normal', 'Verification cancelled.')
          return
        }
        context.appendOutput('normal', 'Selected: Run project verification')
        await verifyNodes(context, collectNodes(context.rootNode))
      },
    )
  },
})

export default createVerifyCatalog
