<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import type ObjectShape from './object-shape'
  import LiteralUnionDraftEditor from './LiteralUnionDraftEditor.svelte'
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
  $effect(() => {
    if (value === serializedValue) return
    definition = UnionDefinition.parse(value) ?? UnionDefinition.create()
    serializedValue = value
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
  }

  const addLiteral = (literal: string | number) => {
    if (definition.type !== 'literal') return
    emit({ ...definition, values: [...definition.values, literal] })
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

    <LiteralUnionDraftEditor
      label="Literals"
      valueType={definition.valueType}
      values={definition.values}
      onAdd={addLiteral}
      onRemove={removeLiteral}
    />
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

  .command-button:disabled,
  .icon-button:disabled {
    opacity: 0.42;
  }
</style>
