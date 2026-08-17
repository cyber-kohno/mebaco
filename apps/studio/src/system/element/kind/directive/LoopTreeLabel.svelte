<script lang="ts">
  import type LoopElement from './loop-element'

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

<span class="loop-label">
  <span class="loop-kind">Loop</span>
  <span class="loop-value">
    <span class="loop-mode">{modeText}&nbsp;</span>
    {#if element.mode === 'count'}
      <span class="loop-prefix">$var.</span><span class="loop-name">{element.indexId}</span>
    {:else}
      <span class="loop-prefix">$var.</span><span class="loop-name">{element.itemId}</span><span class="loop-separator">, </span><span class="loop-prefix">$var.</span><span class="loop-name">{element.indexId}</span>
    {/if}
    <span class="loop-separator">: </span><span class="loop-source">{sourcePreview}</span>
  </span>
</span>

<style>
  .loop-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .loop-kind,
  .loop-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .loop-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #d5efdc;
    color: #27484f;
  }

  .loop-value {
    min-width: 82px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
    color: #f4fbfc;
  }

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
