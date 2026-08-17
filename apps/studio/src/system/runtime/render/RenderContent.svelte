<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type StyleResolver from '../style/style-resolver'
  import type TreeNode from '../../tree/tree-node'
  import ContentHost from '../../element/content-host'
  import RetentionResolver from '../retention/retention-resolver'
  import ElementDispatcher from './ElementDispatcher.svelte'

  type Props = {
    hostNode: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    setActionError: (nodeId: number, error: ScriptError.Value | null) => void
    setStyleResult: (nodeId: number, result: StyleResolver.Result | null) => void
    evaluateRetention?: boolean
    contentNodes?: readonly TreeNode.Node[]
    componentStack?: readonly number[]
  }
  let { hostNode, projectNode, styleCatalog, formulaContext, renderRevision,
    invalidateRuntime, setActionError, setStyleResult, evaluateRetention = true,
    contentNodes, componentStack = [] }: Props = $props()
  const result = $derived.by(() => {
    renderRevision
    return evaluateRetention
      ? RetentionResolver.resolve(hostNode, formulaContext, projectNode)
      : { context: formulaContext, error: null, errorNodeId: null }
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
      {setActionError} {setStyleResult} {componentStack} />
  {/each}
{/if}
