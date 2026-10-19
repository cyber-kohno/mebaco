<script lang="ts">
  import type TextElement from '@system/model/view/text'
  import ValuePreviewTreeLabel from '@system/workspace/tree/label/ValuePreviewTreeLabel.svelte'

  type Props = {
    element: TextElement.Element
  }

  let { element }: Props = $props()

</script>

<span class="text-label">
  <span class="text-kind has-detail">
    Text
  </span>
  <span class="text-value">
    {#if element.source.type === 'formula'}
      <ValuePreviewTreeLabel kind="formula" value={element.source.source} />
    {:else}
      <ValuePreviewTreeLabel kind="literal" value={element.source.value} literalType="string" />
    {/if}
  </span>
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
    background: #496970;
  }

</style>
