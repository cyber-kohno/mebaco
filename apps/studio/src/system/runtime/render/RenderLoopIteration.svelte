<script lang="ts">
  import { untrack } from 'svelte'
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type StyleDeclarationResolver from '../style/style-declaration-resolver'
  import type TreeNode from '../../tree/tree-node'
  import RenderContent from './RenderContent.svelte'
  import { extendRenderInstanceScope } from './render-instance-scope'

  type Props = {
    loopNodeId: number
    iterationIndex: number
    node: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleDeclarationResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    setActionError: (nodeId: number, error: ScriptError.Value | null) => void
    setStyleResult: (
      instanceKey: string,
      nodeId: number,
      result: StyleDeclarationResolver.Result | null,
    ) => void
    componentStack: readonly number[]
  }

  let { loopNodeId, iterationIndex, node, projectNode, styleCatalog,
    formulaContext, renderRevision, invalidateRuntime, setActionError,
    setStyleResult, componentStack }: Props = $props()

  extendRenderInstanceScope(untrack(() => loopNodeId), untrack(() => iterationIndex))
</script>

<RenderContent hostNode={node} {projectNode} {styleCatalog} {formulaContext}
  {renderRevision} {invalidateRuntime} {setActionError} {setStyleResult}
  {componentStack} />
