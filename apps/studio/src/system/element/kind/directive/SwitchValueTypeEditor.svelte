<script lang="ts">
  import LiteralUnionDraftEditor from '../type/LiteralUnionDraftEditor.svelte'
  import SwitchValueType from './switch-value-type'

  type Props = {
    value: string
    literalUnionOptions: readonly SwitchValueType.LiteralUnionOption[]
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let {
    value,
    literalUnionOptions,
    errorMessage = null,
    onValueChange,
  }: Props = $props()

  const definition = $derived(
    SwitchValueType.parse(value) ?? SwitchValueType.createPrimitive(),
  )

  const valueType = $derived(definition.type === 'union'
    ? 'union'
    : definition.primitive)

  const emit = (
    next: SwitchValueType.Definition,
  ) => {
    onValueChange(SwitchValueType.stringify(next))
  }

  const setValueType = (
    nextValueType: SwitchValueType.PrimitiveName | 'union',
  ) => {
    emit(nextValueType === 'union'
      ? SwitchValueType.createUnion('')
      : SwitchValueType.createPrimitive(nextValueType))
  }

  const setUseLiterals = (
    enabled: boolean,
  ) => {
    if (definition.type !== 'primitive') return
    emit(enabled
      ? { ...definition, literals: [] }
      : { type: 'primitive', primitive: definition.primitive })
  }

  const addLiteral = (literal: SwitchValueType.Literal) => {
    if (definition.type !== 'primitive' || definition.literals == null) return
    emit({ ...definition, literals: [...definition.literals, literal] })
  }

  const removeLiteral = (
    index: number,
  ) => {
    if (definition.type !== 'primitive' || definition.literals == null) return
    const literals = definition.literals.filter((_, currentIndex) => currentIndex !== index)
    if (literals.length === 0) {
      emit({ type: 'primitive', primitive: definition.primitive })
      return
    }
    emit({
      ...definition,
      literals,
    })
  }

  const formatLiteral = (
    literal: SwitchValueType.Literal,
  ): string => typeof literal === 'string' ? JSON.stringify(literal) : String(literal)
</script>

<section class="switch-value-type" data-invalid={errorMessage == null ? undefined : true}>
  {#if errorMessage != null}
    <div class="switch-error">{errorMessage}</div>
  {/if}

  <label>
    <span>Value Type</span>
    <select
      value={valueType}
      onchange={(event) => {
        const next = event.currentTarget.value
        setValueType(next === 'number' || next === 'union' ? next : 'string')
      }}
    >
      <option value="string">string</option>
      <option value="number">number</option>
      <option value="union">union</option>
    </select>
  </label>

  {#if definition.type === 'union'}
    <label>
      <span>Union</span>
      <select
        value={definition.unionTypeId}
        onchange={(event) => emit(SwitchValueType.createUnion(event.currentTarget.value))}
      >
        <option value=""></option>
        {#each literalUnionOptions as option}
          <option value={option.value} title={option.title}>{option.label}</option>
        {/each}
      </select>
    </label>
  {:else}
    <label class="literal-toggle">
      <span>Use literals</span>
      <input
        type="checkbox"
        checked={definition.literals != null}
        onchange={(event) => setUseLiterals(event.currentTarget.checked)}
      />
    </label>

    {#if definition.literals != null}
      <LiteralUnionDraftEditor
        label="Literals"
        valueType={definition.primitive}
        values={definition.literals}
        onAdd={addLiteral}
        onRemove={removeLiteral}
      />
    {/if}
  {/if}
</section>

<style>
  .switch-value-type {
    display: grid;
    gap: 14px;
    color: #2b4850;
    font-size: 13px;
  }

  .switch-error {
    color: #b94755;
    font-weight: 700;
  }

  label,
  :global(.literal-draft-editor) {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    font-weight: 700;
  }

  .literal-toggle input {
    justify-self: start;
  }

  select {
    min-width: 0;
    width: min(100%, var(--mbc-width-id-field));
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: #fff;
    color: #2b4850;
    font: inherit;
  }

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
  }

</style>
