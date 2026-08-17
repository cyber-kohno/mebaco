<script lang="ts">
  import ElementRegistry from './element-registry'
  import NodeLabel from './NodeLabel.svelte'
  import type MebacoElement from './element'
  import type TreeNode from '../tree/tree-node'
  import StoreTreeLabel from './kind/variable/store/StoreTreeLabel.svelte'

  type Props = {
    element: MebacoElement.Element
    parentNode?: TreeNode.Node | null
  }

  let { element, parentNode = null }: Props = $props()

  const treeLabel = $derived(ElementRegistry.get(element.kind).treeLabel)
  const TreeLabelComponent = $derived(
    treeLabel.type === 'component' ? treeLabel.Component : undefined,
  )
  const staticValueText = $derived(
    treeLabel.type === 'static' ? treeLabel.getValueText?.(element) : undefined,
  )
</script>

{#if element.kind === 'store'}
  <StoreTreeLabel {parentNode} />
{:else if treeLabel.type === 'static'}
  <NodeLabel
    tone={treeLabel.tone}
    kindText={treeLabel.kindText}
    valueText={staticValueText}
  />
{:else if TreeLabelComponent != null}
  <TreeLabelComponent {element} />
{/if}
