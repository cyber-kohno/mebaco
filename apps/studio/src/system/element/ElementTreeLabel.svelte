<script lang="ts">
  import ElementRegistry from './element-registry'
  import NodeLabel from './NodeLabel.svelte'
  import type MebacoElement from './element'
  import type TreeNode from '../tree/tree-node'
  import StoreTreeLabel from './kind/variable/store/StoreTreeLabel.svelte'

  type Props = {
    element: MebacoElement.Element
    parentNode?: TreeNode.Node | null
    rootNode?: TreeNode.Node
    disabled?: boolean
  }

  let { element, parentNode = null, rootNode, disabled = false }: Props = $props()

  const treeLabel = $derived(ElementRegistry.get(element.kind).treeLabel)
  const TreeLabelComponent = $derived(
    treeLabel.type === 'component' ? treeLabel.Component : undefined,
  )
  const staticValueText = $derived(
    treeLabel.type === 'static' ? treeLabel.getValueText?.(element) : undefined,
  )
</script>

<span class="element-tree-label">
{#if disabled}<span class="disabled-label">× Disabled</span>{/if}
{#if element.kind === 'store'}
  <StoreTreeLabel {parentNode} />
{:else if treeLabel.type === 'static'}
  <NodeLabel
    tone={treeLabel.tone}
    kindText={treeLabel.kindText}
    valueText={staticValueText}
  />
{:else if TreeLabelComponent != null}
  <TreeLabelComponent {element} {parentNode} {rootNode} />
{/if}
</span>

<style>
  .element-tree-label { display: inline-flex; align-items: center; min-width: 0; }
  .disabled-label {
    display: inline-flex;
    align-items: center;
    height: 30px;
    margin-left: 3px;
    margin-right: 0;
    padding: 0 8px;
    border: 1px solid #b86f6f;
    border-radius: 4px;
    background: #6d3939;
    color: #ffe5e5;
    font-size: 12px;
    font-weight: 800;
  }
</style>
