<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type StyleDeclarationResolver from '../style/style-declaration-resolver'
  import type TreeNode from '../../tree/tree-node'
  import RenderLoopIteration from './RenderLoopIteration.svelte'
  import LoopResolver from '../loop/loop-resolver'
  import RuntimeStateDependency from '../runtime-state-dependency'
  import type RuntimeState from '../runtime-state'

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
    return trackStateDependencies(() => LoopResolver.resolve(node, formulaContext))
  })

  $effect(() => {
    setActionError(node.id, result.error)
    return () => setActionError(node.id, null)
  })

</script>

{#each result.iterations as iteration (iteration.index)}
  <RenderLoopIteration loopNodeId={node.id} iterationIndex={iteration.index}
    {node} {projectNode} {styleCatalog}
    formulaContext={iteration.context} {renderRevision} {invalidateRuntime}
    {trackStateDependencies} {invalidateStateDependencies}
    {setActionError} {setStyleResult} {componentStack} />
{/each}
