<script lang="ts">
  import ComponentUseElement from '../../element/kind/component/component-use-element'
  import FormulaContext from '../formula/formula-context'
  import RuntimeProps from '../runtime-props'
  import RuntimeTree from '../runtime-tree'
  import ScriptError from '../script/script-error'
  import type StyleResolver from '../style/style-resolver'
  import type TreeNode from '../../tree/tree-node'
  import RenderContent from './RenderContent.svelte'
  import type FormulaContextType from '../formula/formula-context'
  import type ScriptErrorType from '../script/script-error'

  type Props = {
    node: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleResolver.Catalog
    formulaContext: FormulaContextType.Value
    renderRevision: number
    invalidateRuntime: () => void
    setActionError: (nodeId: number, error: ScriptErrorType.Value | null) => void
    setStyleResult: (nodeId: number, result: StyleResolver.Result | null) => void
    componentStack?: readonly number[]
  }

  let {
    node,
    projectNode,
    styleCatalog,
    formulaContext,
    renderRevision,
    invalidateRuntime,
    setActionError,
    setStyleResult,
    componentStack = [],
  }: Props = $props()

  const componentUse = $derived(RuntimeTree.isComponentUseNode(node) ? node.element : null)
  const componentNode = $derived(
    componentUse?.componentId == null
      ? null
      : ComponentUseElement.findComponentNode(projectNode, node.id, componentUse.componentId),
  )
  const recursiveError = $derived(
    componentNode != null && componentStack.includes(componentNode.id)
      ? ScriptError.create('runtime', `Component '${componentNode.element.kind === 'component' ? componentNode.element.id : ''}' calls itself recursively.`)
      : null,
  )
  const propsResult = $derived.by(() => {
    renderRevision
    if (componentUse == null || componentNode == null || recursiveError != null) {
      return RuntimeProps.empty()
    }
    return RuntimeProps.resolveBindings(
      componentNode,
      componentUse.propBindings ?? [],
      formulaContext,
      projectNode,
    )
  })
  const nextContext = $derived(FormulaContext.create({
    ...formulaContext,
    $props: propsResult.values,
  }))
  const rootViewNodes = $derived(
    componentNode == null ? [] : RuntimeTree.getComponentRootViewNodes(componentNode),
  )
  const error = $derived.by(() => {
    if (componentUse?.componentId == null) {
      return ScriptError.create('runtime', 'Component is not selected.')
    }
    if (componentNode == null) {
      return ScriptError.create('runtime', 'Component was not found.')
    }
    if (recursiveError != null) return recursiveError
    if (propsResult.errors.length > 0) {
      return ScriptError.create('runtime', propsResult.errors[0])
    }
    return null
  })

  $effect(() => {
    setActionError(node.id, error)
    return () => setActionError(node.id, null)
  })
</script>

{#if error == null && componentNode != null}
  <RenderContent
    hostNode={componentNode}
    contentNodes={rootViewNodes}
    {projectNode}
    {styleCatalog}
    formulaContext={nextContext}
    {renderRevision}
    {invalidateRuntime}
    {setActionError}
    {setStyleResult}
    componentStack={[...componentStack, componentNode.id]}
  />
{/if}
