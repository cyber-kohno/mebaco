<script lang="ts">
  import FormulaLabelField from '../formula/FormulaLabelField.svelte'
  import FormulaModeToggle from '../formula/FormulaModeToggle.svelte'
  import SuggestTextInput from './SuggestTextInput.svelte'
  import type ResolvableValue from '../../element/kind/shared/resolvable-value'

  type Primitive = string | number | boolean
  type PrimitiveType = 'string' | 'number' | 'boolean'
  type Editor =
    | { type: 'text' }
    | { type: 'url' }
    | { type: 'token-list' }
    | { type: 'enum', values: readonly string[] }

  type Props = {
    value: ResolvableValue.Value<Primitive>
    primitiveType?: PrimitiveType
    editor?: Editor
    formulaOnly?: boolean
    formulaAriaLabel?: string
    injectionSource?: string
    onValueChange: (value: ResolvableValue.Value<Primitive>) => void
  }

  let {
    value,
    primitiveType = 'string',
    editor = { type: 'text' },
    formulaOnly = false,
    formulaAriaLabel = 'Value formula',
    injectionSource,
    onValueChange,
  }: Props = $props()

  const defaultLiteral = (): Primitive => {
    switch (primitiveType) {
      case 'number': return 0
      case 'boolean': return false
      case 'string': return ''
    }
  }

  const changeMode = (type: 'literal' | 'formula') => {
    onValueChange(type === 'literal'
      ? { type: 'literal', value: defaultLiteral() }
      : { type: 'formula', source: '' })
  }
</script>

<div class="literal-formula-field" class:formula-only={formulaOnly}>
  {#if !formulaOnly}
    <FormulaModeToggle mode={value.type} onModeChange={changeMode} />
  {/if}

  {#if value.type === 'formula'}
    <FormulaLabelField
      value={value.source}
      ariaLabel={formulaAriaLabel}
      {injectionSource}
      expectedType={formulaOnly ? undefined : primitiveType}
      onValueChange={(source) => onValueChange({ type: 'formula', source })}
    />
  {:else if formulaOnly}
    <FormulaLabelField
      value=""
      ariaLabel={formulaAriaLabel}
      {injectionSource}
      onValueChange={(source) => onValueChange({ type: 'formula', source })}
    />
  {:else if primitiveType === 'boolean'}
    <select
      value={String(value.value)}
      aria-label="Literal value"
      onchange={(event) => onValueChange({
        type: 'literal',
        value: event.currentTarget.value === 'true',
      })}
    >
      <option value="false">false</option>
      <option value="true">true</option>
    </select>
  {:else if editor.type === 'enum'}
    <SuggestTextInput
      value={String(value.value)}
      options={editor.values.map((enumValue) => ({ value: enumValue }))}
      onValueChange={(nextValue) => onValueChange({ type: 'literal', value: nextValue })}
    />
  {:else if primitiveType === 'number'}
    <input
      type="number"
      step="any"
      value={String(value.value)}
      aria-label="Literal value"
      onchange={(event) => {
        const numberValue = event.currentTarget.valueAsNumber
        onValueChange({
          type: 'literal',
          value: Number.isFinite(numberValue) ? numberValue : 0,
        })
      }}
    />
  {:else}
    <input
      type={editor.type === 'url' ? 'url' : 'text'}
      value={String(value.value)}
      aria-label="Literal value"
      oninput={(event) => onValueChange({ type: 'literal', value: event.currentTarget.value })}
    />
  {/if}
</div>

<style>
  .literal-formula-field {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: var(--mbc-form-control-gap);
    min-width: 0;
  }

  .literal-formula-field.formula-only {
    grid-template-columns: minmax(0, 1fr);
  }

  input,
  select {
    width: 100%;
    height: 32px;
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

  input:focus,
  select:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }
</style>
