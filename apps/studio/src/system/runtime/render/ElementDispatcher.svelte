<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type StyleResolver from '../style/style-resolver'
  import RenderComponentUse from './RenderComponentUse.svelte'
  import RenderTag from './RenderTag.svelte'
  import RenderText from './RenderText.svelte'
  import RenderConditional from './RenderConditional.svelte'
  import RenderSwitch from './RenderSwitch.svelte'
  import RenderLoop from './RenderLoop.svelte'
  import RenderBlock from './RenderBlock.svelte'
  import RuntimeTree from '../runtime-tree'
  import type ScriptError from '../script/script-error'
  import type TreeNode from '../../tree/tree-node'

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

{#if RuntimeTree.isTagNode(node)}
  <RenderTag
    {node}
    {projectNode}
    {styleCatalog}
    {formulaContext}
    {renderRevision}
    {invalidateRuntime}
    {setActionError}
    {setStyleResult}
    {componentStack}
  />
{:else if RuntimeTree.isTextNode(node)}
  <RenderText {node} {formulaContext} {renderRevision} />
{:else if RuntimeTree.isComponentUseNode(node)}
  <RenderComponentUse
    {node}
    {projectNode}
    {styleCatalog}
    {formulaContext}
    {renderRevision}
    {invalidateRuntime}
    {setActionError}
    {setStyleResult}
    {componentStack}
  />
{:else if RuntimeTree.isConditionalNode(node)}
  <RenderConditional
    {node}
    {projectNode}
    {styleCatalog}
    {formulaContext}
    {renderRevision}
    {invalidateRuntime}
    {setActionError}
    {setStyleResult}
    {componentStack}
  />
{:else if RuntimeTree.isSwitchNode(node)}
  <RenderSwitch
    {node}
    {projectNode}
    {styleCatalog}
    {formulaContext}
    {renderRevision}
    {invalidateRuntime}
    {setActionError}
    {setStyleResult}
    {componentStack}
  />
{:else if RuntimeTree.isLoopNode(node)}
  <RenderLoop
    {node}
    {projectNode}
    {styleCatalog}
    {formulaContext}
    {renderRevision}
    {invalidateRuntime}
    {setActionError}
    {setStyleResult}
    {componentStack}
  />
{:else if RuntimeTree.isBlockNode(node)}
  <RenderBlock
    {node}
    {projectNode}
    {styleCatalog}
    {formulaContext}
    {renderRevision}
    {invalidateRuntime}
    {setActionError}
    {setStyleResult}
    {componentStack}
  />
{/if}
