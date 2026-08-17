<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type StyleResolver from '../style/style-resolver'
  import type TreeNode from '../../tree/tree-node'
  import ElementDispatcher from './ElementDispatcher.svelte'

  type Props = {
    node: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    setActionError: (nodeId: number, error: ScriptError.Value | null) => void
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
</script>

{#each node.children as childNode (childNode.id)}
  <ElementDispatcher node={childNode} {projectNode} {styleCatalog}
    {formulaContext} {renderRevision} {invalidateRuntime}
    {setActionError} {setStyleResult} {componentStack} />
{/each}
