<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import TypeExpression from './type-expression'
  import ValueTypeDefinition from './value-type-definition'

  type Props = {
    value: string
    objectOptions: readonly { value: string; label?: string; name?: string; detail?: string; title?: string }[]
    namedTypeOptions: readonly { value: string; label?: string; name?: string; detail?: string; title?: string }[]
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let {
    value,
    objectOptions,
    namedTypeOptions,
    errorMessage = null,
    onValueChange,
  }: Props = $props()

  let literalDraft = $state('')

  const definition = $derived(
    ValueTypeDefinition.parse(value) ?? ValueTypeDefinition.create(),
  )
  const unwrapped = $derived(TypeExpression.unwrapArray(definition.valueType))
  const base = $derived(unwrapped.base)
  const arrayDepth = $derived(unwrapped.depth)

  const emit = (
    next: ValueTypeDefinition.Definition,
  ) => onValueChange(ValueTypeDefinition.stringify(next))

  const emitBase = (
    nextBase: TypeExpression.Base,
    nextNullable = definition.nullable,
  ) => emit({
    valueType: TypeExpression.wrapArray(nextBase, arrayDepth),
    nullable: nextNullable,
  })

  const setBaseType = (
    baseType: TypeExpression.BaseType,
  ) => {
    literalDraft = ''
    if (baseType === 'reference') {
      emitBase(TypeExpression.createReference(['']), false)
      return
    }
    if (baseType === 'named') {
      emitBase(TypeExpression.createNamed(''), false)
      return
    }
    if (baseType === 'object') {
      emitBase(TypeExpression.createObject(), false)
      return
    }
    emitBase(TypeExpression.createPrimitive(baseType), false)
  }

  const setArrayDepth = (
    depth: number,
  ) => {
    emit({
      valueType: TypeExpression.wrapArray(
        base,
        Math.max(0, Math.min(32, Math.trunc(depth || 0))),
      ),
      nullable: definition.nullable && base.type === 'reference' && depth === 0,
    })
  }

  const setNullable = (
    nullable: boolean,
  ) => emit({ ...definition, nullable })

  const setNamedType = (
    namedTypeId: string,
  ) => {
    if (base.type !== 'named') return
    emitBase(TypeExpression.createNamed(namedTypeId), false)
  }

  const setReference = (
    index: number,
    objectTypeId: string,
  ) => {
    if (base.type !== 'reference') return
    const objectTypeIds = [...base.objectTypeIds]
    objectTypeIds[index] = objectTypeId
    emitBase(TypeExpression.createReference(objectTypeIds))
  }

  const addReference = () => {
    if (base.type !== 'reference') return
    const nextOption = objectOptions.find((option) => !base.objectTypeIds.includes(option.value))
    if (nextOption == null) return
    emitBase(TypeExpression.createReference([...base.objectTypeIds, nextOption.value]))
  }

  const removeReference = (
    index: number,
  ) => {
    if (base.type !== 'reference' || base.objectTypeIds.length <= 1) return
    emitBase(TypeExpression.createReference(
      base.objectTypeIds.filter((_, candidateIndex) => candidateIndex !== index),
    ))
  }

  const getReferenceOptions = (
    objectTypeIds: readonly string[],
    currentObjectTypeId: string,
  ) => objectOptions.filter((option) => (
    option.value === currentObjectTypeId || !objectTypeIds.includes(option.value)
  ))

  const setLiteralUnion = (
    enabled: boolean,
  ) => {
    if (base.type !== 'string' && base.type !== 'number') return
    literalDraft = ''
    emitBase(enabled ? { ...base, literals: [] } : TypeExpression.createPrimitive(base.type))
  }

  const addLiteral = () => {
    if (base.type !== 'string' && base.type !== 'number') return
    if (base.literals == null) return

    if (base.type === 'string') {
      if (literalDraft.length === 0 || base.literals.includes(literalDraft)) return
      emitBase({ ...base, literals: [...base.literals, literalDraft] })
      literalDraft = ''
      return
    }

    if (literalDraft.trim().length === 0) return
    const value = Number(literalDraft)
    if (!Number.isFinite(value) || base.literals.includes(value)) return
    emitBase({ ...base, literals: [...base.literals, value] })
    literalDraft = ''
  }

  const removeLiteral = (
    index: number,
  ) => {
    if ((base.type !== 'string' && base.type !== 'number') || base.literals == null) return
    if (base.type === 'string') {
      emitBase({
        ...base,
        literals: base.literals.filter((_, candidateIndex) => candidateIndex !== index),
      })
      return
    }
    emitBase({
      ...base,
      literals: base.literals.filter((_, candidateIndex) => candidateIndex !== index),
    })
  }

  const formatLiteral = (
    literal: string | number,
  ): string => typeof literal === 'string' ? JSON.stringify(literal) : String(literal)
</script>

<section class="value-type-editor">
  {#if errorMessage != null}
    <div class="editor-error">{errorMessage}</div>
  {/if}

  <label>
    <span>Value Type</span>
    <select
      value={base.type}
      onchange={(event) => setBaseType(event.currentTarget.value as TypeExpression.BaseType)}
    >
      {#each TypeExpression.primitiveTypes as type}
        <option value={type}>{type}</option>
      {/each}
      <option value="reference">{TypeExpression.getBaseTypeLabel('reference')}</option>
      <option value="named">{TypeExpression.getBaseTypeLabel('named')}</option>
    </select>
  </label>

  {#if base.type === 'reference'}
    <div class="detail-field">
      <span class="detail-label">Object Types</span>
      <div class="reference-list">
        {#each base.objectTypeIds as objectTypeId, index}
          <div class="input-row">
            <select
              value={objectTypeId}
              aria-label={`Object Type ${index + 1}`}
              onchange={(event) => setReference(index, event.currentTarget.value)}
            >
              <option value=""></option>
              {#each getReferenceOptions(base.objectTypeIds, objectTypeId) as option}
                <option value={option.value}>{option.label ?? option.value}</option>
              {/each}
            </select>
            <button
              class="icon-button danger"
              type="button"
              title="Remove Object Type"
              aria-label={`Remove Object Type ${index + 1}`}
              disabled={base.objectTypeIds.length <= 1}
              onclick={() => removeReference(index)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        {/each}
        <button
          class="command-button"
          type="button"
          disabled={base.objectTypeIds.length >= objectOptions.length}
          onclick={addReference}
        >
          <Plus size={15} />
          Object Type
        </button>
      </div>
    </div>
  {/if}

  {#if base.type === 'named'}
    <label>
      <span>Union</span>
      <select
        value={base.namedTypeId}
        onchange={(event) => setNamedType(event.currentTarget.value)}
      >
        <option value=""></option>
        {#each namedTypeOptions as option}
          <option value={option.value}>{option.name ?? option.label ?? option.value}</option>
        {/each}
      </select>
    </label>
  {/if}

  {#if base.type === 'string' || base.type === 'number'}
    <label class="check-field">
      <span>Literal Union</span>
      <input
        type="checkbox"
        checked={base.literals != null}
        onchange={(event) => setLiteralUnion(event.currentTarget.checked)}
      />
    </label>

    {#if base.literals != null}
      <div class="detail-field">
        <span class="detail-label">Literals</span>
        <div class="literal-content">
          <div class="input-row">
            <input
              type={base.type === 'number' ? 'number' : 'text'}
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
            {#each base.literals as literal, index}
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

  <label>
    <span>Array Depth</span>
    <input
      class="depth-input"
      type="number"
      min="0"
      max="32"
      step="1"
      value={arrayDepth}
      oninput={(event) => setArrayDepth(Number(event.currentTarget.value))}
    />
  </label>

  {#if base.type === 'reference' && arrayDepth === 0}
    <label class="check-field">
      <span>Nullable</span>
      <input
        type="checkbox"
        checked={definition.nullable}
        onchange={(event) => setNullable(event.currentTarget.checked)}
      />
    </label>
  {/if}
</section>

<style>
  .value-type-editor {
    display: grid;
    gap: 14px;
    color: #2b4850;
    font-size: 13px;
  }

  .editor-error {
    color: #b94755;
    font-weight: 700;
  }

  label,
  .detail-field {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    font-weight: 700;
  }

  .detail-field {
    align-items: start;
  }

  .detail-label {
    padding-top: 8px;
  }

  .reference-list,
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

  select,
  input[type='text'],
  input[type='number'] {
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

  .depth-input {
    width: 90px;
  }

  .check-field input {
    justify-self: start;
    width: 16px;
    height: 16px;
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 96px;
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

  .icon-button.danger {
    color: #ad4c5a;
  }

  .command-button:disabled,
  .icon-button:disabled {
    opacity: 0.42;
  }
</style>
