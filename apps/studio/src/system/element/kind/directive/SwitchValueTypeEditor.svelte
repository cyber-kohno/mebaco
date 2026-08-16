<script lang="ts">
  import { Plus } from '@lucide/svelte'
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

  let literalDraft = $state('')

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
    literalDraft = ''
    emit(nextValueType === 'union'
      ? SwitchValueType.createUnion('')
      : SwitchValueType.createPrimitive(nextValueType))
  }

  const setUseLiterals = (
    enabled: boolean,
  ) => {
    if (definition.type !== 'primitive') return
    literalDraft = ''
    emit(enabled
      ? { ...definition, literals: [] }
      : { type: 'primitive', primitive: definition.primitive })
  }

  const addLiteral = () => {
    if (definition.type !== 'primitive' || definition.literals == null) return

    if (definition.primitive === 'string') {
      if (literalDraft.length === 0 || definition.literals.includes(literalDraft)) return
      emit({ ...definition, literals: [...definition.literals, literalDraft] })
      literalDraft = ''
      return
    }

    if (literalDraft.trim().length === 0) return
    const value = Number(literalDraft)
    if (!Number.isFinite(value) || definition.literals.includes(value)) return
    emit({ ...definition, literals: [...definition.literals, value] })
    literalDraft = ''
  }

  const removeLiteral = (
    index: number,
  ) => {
    if (definition.type !== 'primitive' || definition.literals == null) return
    emit({
      ...definition,
      literals: definition.literals.filter((_, currentIndex) => currentIndex !== index),
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
      <div class="literal-editor">
        <span class="detail-label">Literals</span>
        <div class="literal-content">
          <div class="input-row">
            <input
              type={definition.primitive === 'number' ? 'number' : 'text'}
              value={literalDraft}
              aria-label="Literal Value"
              oninput={(event) => {
                literalDraft = event.currentTarget.value
              }}
              onkeydown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                addLiteral()
              }}
            />
            <button
              class="icon-button"
              type="button"
              title="Add Literal"
              aria-label="Add Literal"
              onclick={addLiteral}
            >
              <Plus size={16} />
            </button>
          </div>

          <div class="chip-list">
            {#each definition.literals as literal, index}
              <span class="chip">
                <span>{formatLiteral(literal)}</span>
                <button
                  type="button"
                  title="Remove Literal"
                  aria-label={`Remove Literal ${formatLiteral(literal)}`}
                  onclick={() => removeLiteral(index)}
                >x</button>
              </span>
            {/each}
          </div>
        </div>
      </div>
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
  .literal-editor {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    font-weight: 700;
  }

  .literal-editor {
    align-items: start;
  }

  .literal-toggle input {
    justify-self: start;
  }

  .detail-label {
    padding-top: 8px;
    font-weight: 700;
  }

  .literal-content {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .input-row {
    display: grid;
    grid-template-columns: minmax(0, var(--mbc-width-id-field)) 32px;
    gap: 4px;
  }

  input[type='text'],
  input[type='number'],
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

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 180px;
    overflow: auto;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    border: 1px solid #9acbd4;
    border-radius: 5px;
    background: #eef8fa;
    color: #6f551c;
    font-weight: 700;
  }

  .chip > span {
    padding: 0 8px;
  }

  .chip button {
    width: 26px;
    height: 26px;
    min-width: 0;
    padding: 0;
    border: 0;
    border-left: 1px solid #b8d9df;
    border-radius: 0;
    background: transparent;
    color: #ad4c5a;
    font: inherit;
    font-size: 15px;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    min-width: 0;
    height: 32px;
    padding: 0;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    font: inherit;
    font-weight: 700;
  }

  .icon-button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }
</style>
