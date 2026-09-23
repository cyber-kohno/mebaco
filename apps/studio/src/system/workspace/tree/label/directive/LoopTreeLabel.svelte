<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type LoopElement from '@system/model/directive/loop'

  type Props = {
    element: LoopElement.Element
  }

  let { element }: Props = $props()

  const modeText = $derived(element.mode === 'collection' ? 'forEach' : 'count')
  const source = $derived(
    (element.mode === 'count' ? element.countSource : element.collectionSource)
      .replace(/\s*\r?\n\s*/g, ' '),
  )
  const sourcePreview = $derived(source.length > 24 ? `${source.slice(0, 24)}...` : source)
</script>

<NodeLabel tone="directive" kindText="Loop">
  {#snippet children()}
    <span class="loop-mode">{modeText}&nbsp;</span>
    {#if element.mode === 'count'}
      <span class="loop-prefix">$var.</span><span class="loop-name">{element.indexId}</span>
    {:else}
      <span class="loop-prefix">$var.</span><span class="loop-name">{element.itemId}</span><span class="loop-separator">, </span><span class="loop-prefix">$var.</span><span class="loop-name">{element.indexId}</span>
    {/if}
    <span class="loop-separator">: </span><span class="loop-source">{sourcePreview}</span>
  {/snippet}
</NodeLabel>

<style>
  .loop-mode {
    color: #ff8f8f;
  }

  .loop-prefix,
  .loop-separator {
    color: rgba(255, 255, 255, 0.8);
  }

  .loop-name {
    color: #cce879;
  }

  .loop-source {
    color: #ffffff;
    font-style: italic;
    opacity: 0.9;
  }
</style>
