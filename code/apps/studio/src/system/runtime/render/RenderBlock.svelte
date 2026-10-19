<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type StyleDeclarationResolver from '../style/style-declaration-resolver'
  import type TreeNode from '@system/model/tree/tree-node'
  import RuntimeStateDependency from '../runtime-state-dependency'
  import type RuntimeState from '../runtime-state'
  import ElementDispatcher from './ElementDispatcher.svelte'

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
</script>

{#each node.children as childNode (childNode.id)}
  <ElementDispatcher node={childNode} {projectNode} {styleCatalog}
    {formulaContext} {renderRevision} {invalidateRuntime}
    {trackStateDependencies} {invalidateStateDependencies}
    {setActionError} {setStyleResult} {componentStack} />
{/each}
