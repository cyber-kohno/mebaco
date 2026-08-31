<script lang="ts">
  import CompactFormulaField from '../../../../ui/formula/CompactFormulaField.svelte'
  import FormulaModeToggle from '../../../../ui/formula/FormulaModeToggle.svelte'
  import TagElement from './tag-element'

  type Props = {
    value: string
    injectionSource?: string
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let {
    value,
    injectionSource,
    errorMessage = null,
    onValueChange,
  }: Props = $props()

  const refKey = $derived(TagElement.parseRefKey(value))

  const emit = (
    nextRefKey: TagElement.RefKey | undefined,
  ) => onValueChange(nextRefKey == null ? '' : JSON.stringify(nextRefKey))

  const setEnabled = (
    enabled: boolean,
  ) => emit(enabled ? { type: 'literal', value: '' } : undefined)

  const changeMode = (
    type: TagElement.RefKey['type'],
  ) => emit(type === 'literal'
    ? { type: 'literal', value: '' }
    : { type: 'formula', source: '' })
</script>

<div class="tag-ref-key-editor">
  <label class="use-ref">
    <input
      type="checkbox"
      checked={refKey != null}
      onchange={(event) => setEnabled(event.currentTarget.checked)}
    />
    <span>Use ref</span>
  </label>

  {#if refKey != null}
    <span class="key-label">Key</span>
    <FormulaModeToggle mode={refKey.type} onModeChange={changeMode} />
    {#if refKey.type === 'formula'}
      <CompactFormulaField
        value={refKey.source}
        ariaLabel="Ref key formula"
        {injectionSource}
        expectedType="string"
        onValueChange={(source) => emit({ type: 'formula', source })}
      />
    {:else}
      <input
        class="key-input"
        type="text"
        value={refKey.value}
        aria-label="Ref key"
        aria-invalid={errorMessage == null ? undefined : true}
        title={errorMessage ?? undefined}
        oninput={(event) => emit({ type: 'literal', value: event.currentTarget.value })}
      />
    {/if}
  {/if}
</div>

<style>
  .tag-ref-key-editor {
    display: grid;
    grid-template-columns: max-content max-content 28px minmax(0, 1fr);
    align-items: center;
    gap: var(--mbc-form-control-gap);
    width: min(100%, var(--mbc-width-id-field));
    min-width: 0;
  }

  .use-ref {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #496970;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  .use-ref input {
    width: 16px;
    height: 16px;
    margin: 0;
  }

  .key-label {
    color: #6d8990;
    font-size: 12px;
    font-weight: 700;
  }

  .key-input {
    width: 100%;
    height: 32px;
    min-width: 0;
    padding: 0 9px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }

  .key-input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .key-input[aria-invalid='true'] {
    border-color: #ca7171;
  }
</style>
