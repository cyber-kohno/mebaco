<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import LiteralUnionDraftEditor from './union/LiteralUnionDraftEditor.svelte'
  import TypeExpression from './type-expression'
  import ValueTypeDefinition from './value-type-definition'
  import SignatureReferencePreview from './signature/SignatureReferencePreview.svelte'

  type Props = {
    value: string
    objectOptions: readonly { value: string; label?: string; name?: string; detail?: string; title?: string }[]
    namedTypeOptions: readonly { value: string; label?: string; name?: string; detail?: string; title?: string; preview?: string; kind?: 'union' | 'signature' }[]
    errorMessage?: string | null
    readOnly?: boolean
    onValueChange: (value: string) => void
  }

  let {
    value,
    objectOptions,
    namedTypeOptions,
    errorMessage = null,
    readOnly = false,
    onValueChange,
  }: Props = $props()

  const definition = $derived(
    ValueTypeDefinition.parse(value) ?? ValueTypeDefinition.create(),
  )
  const unwrapped = $derived(TypeExpression.unwrapArray(definition.valueType))
  const base = $derived(unwrapped.base)
  const arrayDepth = $derived(unwrapped.depth)
  const unionTypeOptions = $derived(
    namedTypeOptions.filter((option) => option.kind !== 'signature'),
  )
  const signatureTypeOptions = $derived(
    namedTypeOptions.filter((option) => option.kind === 'signature'),
  )
  const selectedNamedTypeKind = $derived(
    base.type === 'named'
    && (
      base.namedTypeKind === 'signature'
      || signatureTypeOptions.some((option) => option.value === base.namedTypeId)
    )
      ? 'signature'
      : 'union',
  )
  const selectedBaseType = $derived(
    base.type === 'named' && selectedNamedTypeKind === 'signature'
      ? 'signature'
      : base.type,
  )
  const selectedSignaturePreview = $derived(
    selectedNamedTypeKind === 'signature' && base.type === 'named'
      ? signatureTypeOptions.find((option) => option.value === base.namedTypeId)?.preview
        ?? signatureTypeOptions.find((option) => option.value === base.namedTypeId)?.title
      : undefined,
  )
  const selectedUnionPreview = $derived(
    selectedNamedTypeKind === 'union' && base.type === 'named'
      ? unionTypeOptions.find((option) => option.value === base.namedTypeId)?.title
      : undefined,
  )

  type EditorBaseType = TypeExpression.BaseType | 'signature'

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
    baseType: EditorBaseType,
  ) => {
    if (baseType === 'reference') {
      emitBase(TypeExpression.createReference(['']), false)
      return
    }
    if (baseType === 'named') {
      emitBase(TypeExpression.createNamed(''), false)
      return
    }
    if (baseType === 'signature') {
      emitBase(TypeExpression.createNamed('', 'signature'), false)
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
    emitBase(TypeExpression.createNamed(
      namedTypeId,
      selectedNamedTypeKind === 'signature' && namedTypeId.length === 0
        ? 'signature'
        : 'union',
    ), false)
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
    emitBase(enabled ? { ...base, literals: [] } : TypeExpression.createPrimitive(base.type))
  }

  const addLiteral = (literal: string | number) => {
    if (base.type !== 'string' && base.type !== 'number') return
    if (base.literals == null) return
    if (base.type === 'string') {
      emitBase({ ...base, literals: [...base.literals, String(literal)] })
      return
    }
    emitBase({ ...base, literals: [...base.literals, Number(literal)] })
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

</script>

<section class="value-type-editor" class:read-only-editor={readOnly} inert={readOnly}>
  {#if errorMessage != null}
    <div class="editor-error">{errorMessage}</div>
  {/if}

  <label>
    <span>Value Type</span>
    <select
      value={selectedBaseType}
      onchange={(event) => setBaseType(event.currentTarget.value as EditorBaseType)}
    >
      {#each TypeExpression.primitiveTypes as type}
        <option value={type}>{type}</option>
      {/each}
      <option value="reference">{TypeExpression.getBaseTypeLabel('reference')}</option>
      <option value="named">{TypeExpression.getBaseTypeLabel('named')}</option>
      <option value="signature">Signature</option>
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
      <span>{selectedNamedTypeKind === 'signature' ? 'Signature' : 'Union'}</span>
      <span class="type-selection-control">
        <select
          value={base.namedTypeId}
          onchange={(event) => setNamedType(event.currentTarget.value)}
        >
          <option value=""></option>
          {#each selectedNamedTypeKind === 'signature' ? signatureTypeOptions : unionTypeOptions as option}
            <option value={option.value}>{option.name ?? option.label ?? option.value}</option>
          {/each}
        </select>
        {#if selectedNamedTypeKind === 'signature'}
          <SignatureReferencePreview text={selectedSignaturePreview} />
        {:else}
          <SignatureReferencePreview text={selectedUnionPreview} />
        {/if}
      </span>
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
      <LiteralUnionDraftEditor
        label="Literals"
        valueType={base.type}
        values={base.literals}
        onAdd={addLiteral}
        onRemove={removeLiteral}
      />
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

  .value-type-editor.read-only-editor,
  .value-type-editor.read-only-editor label,
  .value-type-editor.read-only-editor .detail-label {
    color: #1976a2;
  }

  .value-type-editor.read-only-editor :global(input),
  .value-type-editor.read-only-editor :global(select),
  .value-type-editor.read-only-editor :global(button) {
    opacity: 1;
    border-color: #9acbd4;
    background: transparent;
    color: #1976a2;
    -webkit-text-fill-color: #1976a2;
    cursor: default;
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

  .reference-list {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .type-selection-control {
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
