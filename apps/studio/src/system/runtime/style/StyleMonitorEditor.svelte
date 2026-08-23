<script lang="ts">
  import type TreeNode from '../../tree/tree-node'
  import StyleElement from '../../element/kind/view/style-element'
  import StyleParameterCatalog from '../../element/kind/view/style-parameter-catalog'
  import FormulaContext from '../formula/formula-context'
  import StyleDeclarationResolver from './style-declaration-resolver'
  import ResolvedStyleMonitor from './ResolvedStyleMonitor.svelte'

  type Props = {
    rootNode: TreeNode.Node
    nodeId: number | null
    parentNodeId: number | null
    styleId: string
    rules: string
    bases: string
  }

  let { rootNode, nodeId, parentNodeId, styleId, rules, bases }: Props = $props()

  const replaceStyle = (
    node: TreeNode.Node,
    targetNodeId: number,
    element: StyleElement.Element,
  ): TreeNode.Node => ({
    ...node,
    element: node.id === targetNodeId ? element : node.element,
    children: node.children.map((child) => replaceStyle(child, targetNodeId, element)),
  })

  const appendStyle = (
    node: TreeNode.Node,
    targetParentNodeId: number,
    element: StyleElement.Element,
  ): TreeNode.Node => ({
    ...node,
    children: node.id === targetParentNodeId
      ? [
          ...node.children,
          {
            id: Number.MIN_SAFE_INTEGER,
            element,
            isOpen: true,
            children: [],
          },
        ]
      : node.children.map((child) => appendStyle(child, targetParentNodeId, element)),
  })

  const preview = $derived.by(() => {
    const draft = StyleElement.create(
      styleId,
      StyleElement.parseRules(rules),
      StyleElement.parseBases(bases),
    )
    const previewRoot = nodeId != null
      ? replaceStyle(rootNode, nodeId, draft)
      : parentNodeId != null
        ? appendStyle(rootNode, parentNodeId, draft)
        : null
    if (previewRoot == null) return null

    const parameters = StyleParameterCatalog
      .createCatalog(previewRoot)
      .resolve(styleId)
    const unresolved = parameters.parameters
      .filter((parameter) => parameter.defaultValue === undefined)

    if (parameters.issues.length > 0 || unresolved.length > 0) {
      return {
        resolution: { declarations: [], errors: [] },
        unresolved,
        issues: parameters.issues.map((issue) => issue.message),
      }
    }

    const application = {
      referenceId: 'style-monitor',
      styleId,
      arguments: parameters.parameters.map((parameter) => ({
        parameterId: parameter.parameterId,
        binding: { type: 'default' as const },
      })),
    }
    const resolution = StyleDeclarationResolver
      .createCatalog(previewRoot)
      .resolve([application], FormulaContext.createEmpty(), {
        includeUnresolvedDeclarations: true,
      })

    return {
      resolution,
      unresolved,
      issues: [],
    }
  })
</script>

<ResolvedStyleMonitor
  resolution={preview?.resolution ?? null}
  unresolved={preview?.unresolved ?? []}
  issues={preview?.issues ?? []}
  localStyleId={styleId}
/>
