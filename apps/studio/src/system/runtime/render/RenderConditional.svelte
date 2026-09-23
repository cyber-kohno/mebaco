<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type StyleDeclarationResolver from '../style/style-declaration-resolver'
  import type TreeNode from '@system/model/tree/tree-node'
  import ConditionalResolver from '../conditional/conditional-resolver'
  import RuntimeStateDependency from '../runtime-state-dependency'
  import type RuntimeState from '../runtime-state'
  import RenderContent from './RenderContent.svelte'

  type Props = {
    node: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleDeclarationResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    trackStateDependencies: RuntimeStateDependency.Tracker
    invalidateStateDependencies: RuntimeState.WriteHandler
    setActionError: (nodeId: number, error: ScriptError.Value | null) => void
    setStyleResult: (instanceKey: string, nodeId: number, result: StyleDeclarationResolver.Result | null) => void
    componentStack?: readonly number[]
  }

  let {
    node,
    projectNode,
    styleCatalog,
    formulaContext,
    renderRevision,
    invalidateRuntime,
    trackStateDependencies,
    invalidateStateDependencies,
    setActionError,
    setStyleResult,
    componentStack = [],
  }: Props = $props()

  const result = $derived.by(() => {
    renderRevision
    return trackStateDependencies(() => ConditionalResolver.resolve(node, formulaContext))
  })

  $effect(() => {
    setActionError(node.id, result.error)
    return () => setActionError(node.id, null)
  })

</script>

{#if result.branchNode != null}
  <RenderContent hostNode={result.branchNode} {projectNode} {styleCatalog} {formulaContext}
    {renderRevision} {invalidateRuntime} {trackStateDependencies}
    {invalidateStateDependencies}
    {setActionError} {setStyleResult} {componentStack} />
{/if}
