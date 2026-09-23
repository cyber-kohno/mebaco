<script lang="ts">
  import FormulaLabelField from '@system/ui/formula/FormulaLabelField.svelte'
  import FormulaModeToggle from '@system/ui/formula/FormulaModeToggle.svelte'
  import TextElement from '@system/model/view/text'

  type Props = {
    value: string
    injectionSource?: string
    maxLiteralLength?: number
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let {
    value,
    injectionSource,
    maxLiteralLength,
    errorMessage = null,
    onValueChange,
  }: Props = $props()

  const source = $derived(
    TextElement.parseSource(value) ?? TextElement.createLiteral('').source,
  )

  const emit = (
    nextSource: TextElement.Source,
  ) => onValueChange(TextElement.stringifySource(nextSource))

  const changeMode = (
    type: TextElement.Source['type'],
  ) => emit(type === 'literal'
    ? { type: 'literal', value: '' }
    : { type: 'formula', source: '' })
</script>

<div class="text-source-editor">
  <FormulaModeToggle mode={source.type} onModeChange={changeMode} />
  {#if source.type === 'formula'}
    <FormulaLabelField
      value={source.source}
      ariaLabel="Text formula"
      {injectionSource}
      expectedType="string"
      validationMessage={errorMessage ?? undefined}
      onValueChange={(formulaSource) => emit({ type: 'formula', source: formulaSource })}
    />
  {:else}
    <input
      type="text"
      value={source.value}
      maxlength={maxLiteralLength}
      aria-label="Text"
      aria-invalid={errorMessage == null ? undefined : true}
      title={errorMessage ?? undefined}
      oninput={(event) => emit({ type: 'literal', value: event.currentTarget.value })}
    />
  {/if}
</div>

<style>
  .text-source-editor {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: center;
    gap: var(--mbc-form-control-gap);
    width: 100%;
    min-width: 0;
  }

  input {
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

  input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  input[aria-invalid='true'] {
    border-color: var(--mbc-color-validation-error-strong);
    background: var(--mbc-color-validation-error);
  }
</style>
