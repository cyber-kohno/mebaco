<script lang="ts">
  import ElementRegistry from './element-registry'
  import NodeLabel from './NodeLabel.svelte'
  import type MebacoElement from './element'

  type Props = {
    element: MebacoElement.Element
  }

  let { element }: Props = $props()

  const treeLabel = $derived(ElementRegistry.get(element.kind).treeLabel)
  const TreeLabelComponent = $derived(
    treeLabel.type === 'component' ? treeLabel.Component : undefined,
  )
  const staticValueText = $derived(
    treeLabel.type === 'static' ? treeLabel.getValueText?.(element) : undefined,
  )
</script>

{#if treeLabel.type === 'static'}
  <NodeLabel
    tone={treeLabel.tone}
    kindText={treeLabel.kindText}
    valueText={staticValueText}
  />
{:else if TreeLabelComponent != null}
  <TreeLabelComponent {element} />
{/if}
