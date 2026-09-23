<script lang="ts">
  import FormulaLabelField from '@system/ui/formula/FormulaLabelField.svelte'
  import FormulaModeToggle from '@system/ui/formula/FormulaModeToggle.svelte'
  import TagElement from '@system/model/view/tag'

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

  const partialKey = $derived(TagElement.parsePartialKey(value))

  const emit = (
    nextPartialKey: TagElement.PartialKey | undefined,
  ) => onValueChange(nextPartialKey == null ? '' : JSON.stringify(nextPartialKey))

  const setEnabled = (
    enabled: boolean,
  ) => emit(enabled ? { type: 'literal', value: '' } : undefined)

  const changeMode = (
    type: TagElement.PartialKey['type'],
  ) => emit(type === 'literal'
    ? { type: 'literal', value: '' }
    : { type: 'formula', source: '' })
</script>

<div class="tag-partial-key-editor">
  <label class="use-partial">
    <input
      type="checkbox"
      checked={partialKey != null}
      onchange={(event) => setEnabled(event.currentTarget.checked)}
    />
    <span>Use partial</span>
  </label>

  {#if partialKey != null}
    <span class="key-label">Key</span>
    <FormulaModeToggle mode={partialKey.type} onModeChange={changeMode} />
    {#if partialKey.type === 'formula'}
      <FormulaLabelField
        value={partialKey.source}
        ariaLabel="Partial key formula"
        {injectionSource}
        expectedType="string"
        onValueChange={(source) => emit({ type: 'formula', source })}
      />
    {:else}
      <input
        class="key-input"
        type="text"
        value={partialKey.value}
        aria-label="Partial key"
        aria-invalid={errorMessage == null ? undefined : true}
        title={errorMessage ?? undefined}
        oninput={(event) => emit({ type: 'literal', value: event.currentTarget.value })}
      />
    {/if}
  {/if}
</div>

<style>
  .tag-partial-key-editor {
    display: grid;
    grid-template-columns: max-content max-content 28px minmax(0, 1fr);
    align-items: center;
    gap: var(--mbc-form-control-gap);
    width: min(100%, var(--mbc-width-id-field));
    min-width: 0;
  }

  .use-partial {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #496970;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  .use-partial input {
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
