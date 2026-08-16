<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import type ObjectShape from './object-shape'
  import UnionDefinition from './union-definition'

  type Props = {
    value: string
    objectOptions: readonly ObjectShape.ObjectOption[]
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let {
    value,
    objectOptions,
    errorMessage = null,
    onValueChange,
  }: Props = $props()

  let definition = $state<UnionDefinition.Definition>(UnionDefinition.create())
  let serializedValue = $state('')
  let literalDraft = $state('')

  $effect(() => {
    if (value === serializedValue) return
    definition = UnionDefinition.parse(value) ?? UnionDefinition.create()
    serializedValue = value
    literalDraft = ''
  })

  const emit = (nextDefinition: UnionDefinition.Definition) => {
    const nextValue = UnionDefinition.stringify(nextDefinition)
    definition = nextDefinition
    serializedValue = nextValue
    onValueChange(nextValue)
  }

  const setUnionType = (type: UnionDefinition.Definition['type']) => {
    emit(type === 'object'
      ? UnionDefinition.createObject([objectOptions[0]?.value ?? ''])
      : UnionDefinition.createLiteral())
  }

  const setLiteralValueType = (valueType: UnionDefinition.LiteralValueType) => {
    if (definition.type !== 'literal') return
    emit(UnionDefinition.createLiteral(valueType))
    literalDraft = ''
  }

  const addLiteral = () => {
    if (definition.type !== 'literal') return

    if (definition.valueType === 'string') {
      if (literalDraft.length === 0 || definition.values.includes(literalDraft)) return
      emit({ ...definition, values: [...definition.values, literalDraft] })
      literalDraft = ''
      return
    }

    if (literalDraft.trim().length === 0) return
    const value = Number(literalDraft)
    if (!Number.isFinite(value) || definition.values.includes(value)) return
    emit({ ...definition, values: [...definition.values, value] })
    literalDraft = ''
  }

  const removeLiteral = (index: number) => {
    if (definition.type !== 'literal') return
    emit({
      ...definition,
      values: definition.values.filter((_, candidateIndex) => candidateIndex !== index),
    })
  }

  const setObjectType = (index: number, objectTypeId: string) => {
    if (definition.type !== 'object') return
    emit({
      ...definition,
      objectTypeIds: definition.objectTypeIds.map((item, candidateIndex) => (
        candidateIndex === index ? objectTypeId : item
      )),
    })
  }

  const getObjectOptions = (
    objectTypeIds: readonly string[],
    currentObjectTypeId: string,
  ) => objectOptions.filter((option) => (
    option.value === currentObjectTypeId || !objectTypeIds.includes(option.value)
  ))

  const addObjectType = () => {
    if (definition.type !== 'object') return
    const objectTypeIds = definition.objectTypeIds
    const nextOption = objectOptions.find((option) => (
      !objectTypeIds.includes(option.value)
    ))
    if (nextOption == null) return
    emit({
      ...definition,
      objectTypeIds: [...objectTypeIds, nextOption.value],
    })
  }

  const removeObjectType = (index: number) => {
    if (definition.type !== 'object') return
    emit({
      ...definition,
      objectTypeIds: definition.objectTypeIds.filter((_, candidateIndex) => (
        candidateIndex !== index
      )),
    })
  }

  const formatLiteral = (literal: string | number): string => (
    typeof literal === 'string' ? JSON.stringify(literal) : String(literal)
  )
</script>

<div class="union-editor">
  {#if errorMessage != null}
    <div class="union-error">{errorMessage}</div>
  {/if}

  <label>
    <span>Union Type</span>
    <select
      value={definition.type}
      onchange={(event) => setUnionType(event.currentTarget.value as UnionDefinition.Definition['type'])}
    >
      <option value="literal">Literal</option>
      <option value="object">Object</option>
    </select>
  </label>

  {#if definition.type === 'literal'}
    <label>
      <span>Value Type</span>
      <select
        value={definition.valueType}
        onchange={(event) => setLiteralValueType(event.currentTarget.value as UnionDefinition.LiteralValueType)}
      >
        <option value="string">string</option>
        <option value="number">number</option>
      </select>
    </label>

    <div class="literal-editor">
      <span class="detail-label">Literals</span>
      <div class="literal-content">
        <div class="input-row">
          <input
            type={definition.valueType === 'number' ? 'number' : 'text'}
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
          {#each definition.values as literal, index}
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
  {:else}
    <div class="object-editor">
      <span class="detail-label">Objects</span>
      <div class="object-content">
        {#each definition.objectTypeIds as objectTypeId, index}
          <div class="input-row">
            <select
              value={objectTypeId}
              aria-label={`Object Type ${index + 1}`}
              onchange={(event) => setObjectType(index, event.currentTarget.value)}
            >
              <option value=""></option>
              {#each getObjectOptions(definition.objectTypeIds, objectTypeId) as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            <button
              class="icon-button danger"
              type="button"
              title="Remove Object Type"
              aria-label={`Remove Object Type ${index + 1}`}
              onclick={() => removeObjectType(index)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        {/each}

        <button
          class="command-button"
          type="button"
          disabled={definition.objectTypeIds.length >= objectOptions.length}
          onclick={addObjectType}
        >
          <Plus size={15} />
          Object
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .union-editor {
    display: grid;
    gap: 14px;
    color: #2b4850;
    font-size: 13px;
  }

  .union-error {
    color: #b94755;
    font-weight: 700;
  }

  label,
  .literal-editor,
  .object-editor {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
  }

  label {
    align-items: center;
    font-weight: 700;
  }

  .detail-label {
    padding-top: 8px;
    font-weight: 700;
  }

  .literal-content,
  .object-content {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .input-row {
    display: grid;
    grid-template-columns: minmax(0, var(--mbc-width-id-field)) 32px;
    gap: 4px;
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

  input,
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

  .command-button,
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    font: inherit;
    font-weight: 700;
  }

  .command-button {
    gap: 6px;
    width: fit-content;
    padding: 0 12px;
  }

  .icon-button {
    width: 32px;
    min-width: 0;
    padding: 0;
  }

  .command-button:hover,
  .icon-button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }

  .icon-button.danger {
    color: #ad4c5a;
  }

  .command-button:disabled {
    opacity: 0.42;
  }
</style>
