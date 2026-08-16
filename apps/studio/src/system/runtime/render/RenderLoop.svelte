<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type StyleResolver from '../style/style-resolver'
  import type TreeNode from '../../tree/tree-node'
  import RenderContent from './RenderContent.svelte'
  import LoopResolver from '../loop/loop-resolver'

  type Props = {
    node: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    setActionError: (nodeId: number, error: ScriptError.Value | null) => void
    setStyleResult: (nodeId: number, result: StyleResolver.Result | null) => void
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
  }: Props = $props()

  const result = $derived.by(() => {
    renderRevision
    return LoopResolver.resolve(node, formulaContext)
  })

  $effect(() => {
    setActionError(node.id, result.error)
    return () => setActionError(node.id, null)
  })

</script>

{#each result.iterations as iteration (iteration.index)}
  <RenderContent hostNode={node} {projectNode} {styleCatalog}
    formulaContext={iteration.context} {renderRevision} {invalidateRuntime}
    {setActionError} {setStyleResult} />
{/each}
