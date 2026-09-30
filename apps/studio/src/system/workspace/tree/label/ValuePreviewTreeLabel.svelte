<script lang="ts">
  import TypeLiteralLabel from '@system/model/type-system/type-literal-label'

  type Props = {
    kind: 'literal' | 'formula' | 'default'
    value?: string
    literalType?: 'string' | 'raw'
  }

  let {
    kind,
    value = '',
    literalType = 'raw',
  }: Props = $props()

  const preview = $derived.by(() => {
    if (kind === 'default') return 'default'
    const text = kind === 'literal' && literalType === 'string'
      ? TypeLiteralLabel.format(value)
      : value.replace(/\s*\r?\n\s*/g, ' ')
    return text.length > 32 ? `${text.slice(0, 32)}...` : text
  })
</script>

<span class="value-preview" class:literal={kind === 'literal'} class:formula={kind === 'formula'} class:default={kind === 'default'}>
  {#if kind === 'formula'}<span class="formula-marker">ƒ</span>{/if}
  <span class="value-text">{preview}</span>
</span>

<style>
  .value-preview {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .literal { color: #ffffff; }
  .formula { color: #a8e8eb; }
  .default { color: rgba(255, 255, 255, 0.55); }

  .formula-marker {
    flex: none;
    color: #e04d5f;
    font-style: normal;
    font-weight: 800;
  }

  .value-text { min-width: 0; }
</style>
