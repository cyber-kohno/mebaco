<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type StyleDeclarationResolver from '../style/style-declaration-resolver'
  import type RuntimeState from '../runtime-state'
  import type TreeNode from '../../tree/tree-node'
  import ContentHost from '../../element/content-host'
  import RetentionResolver from '../retention/retention-resolver'
  import RuntimeStateDependency from '../runtime-state-dependency'
  import ElementDispatcher from './ElementDispatcher.svelte'

  type Props = {
    hostNode: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleDeclarationResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    trackStateDependencies: RuntimeStateDependency.Tracker
    invalidateStateDependencies: RuntimeState.WriteHandler
    setActionError: (nodeId: number, error: ScriptError.Value | null) => void
    setStyleResult: (instanceKey: string, nodeId: number, result: StyleDeclarationResolver.Result | null) => void
    evaluateRetention?: boolean
    contentNodes?: readonly TreeNode.Node[]
    slotContents?: ReadonlyMap<string, TreeNode.Node>
    slotDefinitions?: ReadonlyMap<string, TreeNode.Node>
    slotCallerContext?: FormulaContext.Value
    componentStack?: readonly number[]
  }
  let { hostNode, projectNode, styleCatalog, formulaContext, renderRevision,
    invalidateRuntime, trackStateDependencies, invalidateStateDependencies,
    setActionError, setStyleResult, evaluateRetention = true,
    contentNodes, slotContents, slotDefinitions, slotCallerContext,
    componentStack = [] }: Props = $props()
  const result = $derived.by(() => {
    renderRevision
    return trackStateDependencies(() => evaluateRetention
      ? RetentionResolver.resolve(hostNode, formulaContext, projectNode)
      : { context: formulaContext, error: null, errorNodeId: null })
  })
  const children = $derived(contentNodes ?? ContentHost.getContentChildren(hostNode))
  $effect(() => {
    setActionError(result.errorNodeId ?? hostNode.id, result.error)
    return () => setActionError(hostNode.id, null)
  })
</script>

{#if result.error == null}
  {#each children as childNode (childNode.id)}
    <ElementDispatcher node={childNode} {projectNode} {styleCatalog}
      formulaContext={result.context} {renderRevision} {invalidateRuntime}
      {trackStateDependencies} {invalidateStateDependencies}
      {setActionError} {setStyleResult} {componentStack}
      {slotContents} {slotDefinitions} {slotCallerContext} />
  {/each}
{/if}
