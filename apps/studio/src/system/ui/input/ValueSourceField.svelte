<script lang="ts">
  import CompactFormulaField from '../formula/CompactFormulaField.svelte'
  import FormulaModeToggle from '../formula/FormulaModeToggle.svelte'
  import SuggestTextInput from './SuggestTextInput.svelte'
  import ValueSource from './value-source'
  import ValueTypeDefinition from '../../element/kind/type/value-type-definition'
  import TypeExpression from '../../element/kind/type/type-expression'

  type Props = {
    value: string
    valueType?: string
    arrayDepth?: number
    literalOnly?: boolean
    literalOptions?: readonly { value: string; label?: string }[]
    valueTypeDefinition?: ValueTypeDefinition.Definition
    expectedTypeText?: string
    injectionSource?: string
    onValueChange: (value: string) => void
  }

  let {
    value,
    valueType = 'string',
    arrayDepth = 0,
    literalOnly = false,
    literalOptions = [],
    valueTypeDefinition,
    expectedTypeText,
    injectionSource,
    onValueChange,
  }: Props = $props()

  const source = $derived(ValueSource.parse(value) ?? ValueSource.createDefault())
  const resolvedValueType = $derived(valueTypeDefinition == null
    ? valueType
    : ValueTypeDefinition.getBaseType(valueTypeDefinition))
  const resolvedArrayDepth = $derived(valueTypeDefinition == null
    ? arrayDepth
    : ValueTypeDefinition.getArrayDepth(valueTypeDefinition))
  const inlineLiteralOptions = $derived.by(() => {
    if (valueTypeDefinition == null) return []
    const { base, depth } = TypeExpression.unwrapArray(valueTypeDefinition.valueType)
    if (depth > 0 || (base.type !== 'string' && base.type !== 'number')) return []
    return (base.literals ?? []).map((value) => ({
      value: String(value),
      label: String(value),
    }))
  })
  const resolvedLiteralOptions = $derived(
    literalOptions.length > 0 ? literalOptions : inlineLiteralOptions,
  )
  const literalAvailable = $derived(
    resolvedLiteralOptions.length > 0
    || (resolvedArrayDepth === 0
      && (resolvedValueType === 'string' || resolvedValueType === 'number' || resolvedValueType === 'boolean')),
  )
  const expectedType = $derived(
    literalAvailable
      && (resolvedValueType === 'string' || resolvedValueType === 'number' || resolvedValueType === 'boolean')
      ? resolvedValueType as 'string' | 'number' | 'boolean'
      : undefined,
  )
  const binding = $derived(source.type === 'default' ? 'default' : 'value')

  const emit = (
    nextValue: ValueSource.Value,
  ) => onValueChange(ValueSource.stringify(nextValue))

  $effect(() => {
    if (literalOnly && source.type === 'formula') {
      emit(ValueSource.createDefault())
      return
    }
    if (!literalAvailable && source.type === 'literal') {
      emit(ValueSource.createDefault())
    }
  })

  const changeBinding = (
    nextBinding: 'default' | 'value',
  ) => {
    if (nextBinding === 'default') {
      emit(ValueSource.createDefault())
      return
    }
    emit(literalAvailable
      ? { type: 'literal', value: '' }
      : literalOnly
        ? ValueSource.createDefault()
        : { type: 'formula', source: '' })
  }

  const changeMode = (
    type: 'literal' | 'formula',
  ) => {
    emit(type === 'literal'
      ? { type: 'literal', value: '' }
      : { type: 'formula', source: '' })
  }
</script>

<div class="value-source-field">
  <select
    value={binding}
    aria-label="Initial binding"
    onchange={(event) => changeBinding(event.currentTarget.value as 'default' | 'value')}
  >
    <option value="default">Type default</option>
    {#if !literalOnly || literalAvailable}
      <option value="value">Set Value</option>
    {/if}
  </select>

  {#if source.type === 'default'}
    <span class="default-value">Type default</span>
  {:else}
    <div
      class:formula-only={!literalAvailable}
      class:literal-only={literalOnly}
      class="specified-value"
    >
      {#if literalAvailable && !literalOnly}
        <FormulaModeToggle
          mode={source.type}
          onModeChange={changeMode}
        />
      {/if}

      {#if source.type === 'formula'}
        <CompactFormulaField
          value={source.source}
          ariaLabel="Initial value formula"
          {injectionSource}
          {expectedType}
          {expectedTypeText}
          onValueChange={(formulaSource) => emit({ type: 'formula', source: formulaSource })}
        />
      {:else if resolvedLiteralOptions.length > 0}
        <SuggestTextInput
          value={source.value}
          options={resolvedLiteralOptions}
          onValueChange={(nextValue) => emit({ type: 'literal', value: nextValue })}
        />
      {:else if resolvedValueType === 'boolean'}
        <select
          value={source.value}
          aria-label="Literal value"
          onchange={(event) => emit({ type: 'literal', value: event.currentTarget.value })}
        >
          <option value=""></option>
          <option value="false">false</option>
          <option value="true">true</option>
        </select>
      {:else}
        <input
          type={resolvedValueType === 'number' ? 'number' : 'text'}
          value={source.value}
          aria-label="Literal value"
          oninput={(event) => emit({ type: 'literal', value: event.currentTarget.value })}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .value-source-field {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    align-items: center;
    gap: var(--mbc-form-column-gap);
    width: min(100%, var(--mbc-width-id-field));
    min-width: 0;
  }

  .specified-value {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: var(--mbc-form-control-gap);
    min-width: 0;
  }

  .specified-value.formula-only {
    grid-template-columns: minmax(0, 1fr);
  }

  .specified-value.literal-only {
    grid-template-columns: minmax(0, 1fr);
  }

  select,
  input,
  .default-value {
    width: 100%;
    height: 32px;
    box-sizing: border-box;
  }

  select,
  input {
    padding: 0 9px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 13px;
    outline: none;
  }

  select:focus,
  input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .default-value {
    display: flex;
    align-items: center;
    padding: 0 9px;
    border: 1px solid rgba(154, 203, 212, 0.58);
    border-radius: 6px;
    background: rgba(232, 242, 244, 0.75);
    color: #6d8990;
    font-size: 13px;
  }
</style>
