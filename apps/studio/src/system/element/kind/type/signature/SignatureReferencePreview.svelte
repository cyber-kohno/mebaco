<script lang="ts">
  type Props = {
    text?: string | null
  }

  let { text = null }: Props = $props()
</script>

{#if text != null && text.length > 0}
  <span class="signature-reference-preview" title={text}>{text}</span>
{/if}

<style>
  .signature-reference-preview {
    display: block;
    box-sizing: border-box;
    width: min(100%, var(--mbc-width-id-field));
    min-width: 0;
    padding: 7px 10px;
    overflow: hidden;
    border: 1px solid rgba(154, 203, 212, 0.72);
    border-radius: 6px;
    background: rgba(232, 242, 244, 0.72);
    color: #496970;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
