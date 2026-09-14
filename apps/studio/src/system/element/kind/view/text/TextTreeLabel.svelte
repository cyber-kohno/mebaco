<script lang="ts">
  import type TextElement from './text-element'

  type Props = {
    element: TextElement.Element
  }

  let { element }: Props = $props()

  const literalPreview = $derived(
    element.source.type === 'literal' ? element.source.value : '',
  )
  const formulaPreview = $derived.by(() => {
    const source = element.source.type === 'formula'
      ? element.source.source.replace(/\s*\r?\n\s*/g, ' ')
      : ''
    return source.length > 32 ? `${source.slice(0, 32)}...` : source
  })
  const hasValue = $derived(
    element.source.type === 'formula'
      ? formulaPreview.length > 0
      : literalPreview.length > 0,
  )
</script>

<span class="text-label">
  <span class:has-detail={hasValue} class="text-kind">
    Text
  </span>
  {#if hasValue}
    <span
      class:formula-value={element.source.type === 'formula'}
      class:literal-value={element.source.type === 'literal'}
      class="text-value"
    >
      {#if element.source.type === 'formula'}
        <span class="formula-return">return</span>
        <span>{formulaPreview}</span>
      {:else}
        <span>{literalPreview}</span>
      {/if}
    </span>
  {/if}
</span>

<style>
  .text-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.9;
  }

  .text-kind,
  .text-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .text-kind {
    padding: 0 10px;
    border-radius: 4px;
    background: #dcedcf;
    color: #27484f;
  }

  .text-kind.has-detail {
    border-radius: 4px 0 0 4px;
  }

  .text-value {
    gap: 6px;
    min-width: 0;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #14171a;
  }

  .text-value.literal-value {
    color: #d9f5fa;
  }

  .text-value.formula-value {
    color: #ffe0b2;
    font-style: italic;
  }

  .formula-return {
    color: #e04d5f;
  }
</style>
