<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import LiteralUnionDraftEditor from './LiteralUnionDraftEditor.svelte'
  import TypeExpression from './type-expression'
  import ObjectShape from './object-shape'
  import SignatureReferencePreview from './SignatureReferencePreview.svelte'
  import TypeLiteralLabel from './type-literal-label'

  type Props = {
    objectId: string
    value: string
    objectOptions: readonly ObjectShape.ObjectOption[]
    namedTypeOptions: readonly { value: string; label?: string; name?: string; detail?: string; title?: string; preview?: string; kind?: 'union' | 'signature' }[]
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  type PropertyRow = {
    type: 'property'
    property: TypeExpression.Property
    path: number[]
    depth: number
  }

  type CloseRow = {
    type: 'close'
    path: number[]
    depth: number
    arrayDepth: number
    nullable: boolean
  }

  type Row = PropertyRow | CloseRow
  type ObjectShapeBaseType = TypeExpression.BaseType | 'signature'

  let {
    objectId,
    value,
    objectOptions,
    namedTypeOptions,
    errorMessage = null,
    onValueChange,
  }: Props = $props()

  let properties = $state<TypeExpression.Property[]>([])
  let baseObjectIds = $state<string[]>([])
  let serializedValue = $state('')
  let selectedPath = $state<number[]>([])

  $effect(() => {
    if (value === serializedValue) return
    const shape = ObjectShape.parse(value) ?? ObjectShape.create()
    properties = shape.properties
    baseObjectIds = shape.baseObjectIds
    serializedValue = value
    selectedPath = []
  })

  const rows = $derived.by(() => {
    const result: Row[] = []
    const collect = (
      level: TypeExpression.Property[],
      parentPath: number[],
      depth: number,
    ) => {
      level.forEach((property, index) => {
        const path = [...parentPath, index]
        const { base, depth: arrayDepth } = TypeExpression.unwrapArray(property.valueType)
        result.push({ type: 'property', property, path, depth })
        if (base.type === 'object') {
          collect(base.properties, path, depth + 1)
          result.push({ type: 'close', path, depth, arrayDepth, nullable: property.nullable })
        }
      })
    }
    collect(properties, [], 1)
    return result
  })

  const pathsEqual = (left: number[], right: number[]): boolean => (
    left.length === right.length && left.every((value, index) => value === right[index])
  )

  const getLevel = (
    root: TypeExpression.Property[],
    parentPath: number[],
  ): TypeExpression.Property[] | null => {
    let level = root
    for (const index of parentPath) {
      const property = level[index]
      if (property == null) return null
      const base = TypeExpression.unwrapArray(property.valueType).base
      if (base.type !== 'object') return null
      level = base.properties
    }
    return level
  }

  const getSelectedProperty = (): TypeExpression.Property | null => {
    if (selectedPath.length === 0) return null
    const level = getLevel(properties, selectedPath.slice(0, -1))
    return level?.[selectedPath.at(-1)!] ?? null
  }

  const selectedProperty = $derived.by(getSelectedProperty)
  const selectedBase = $derived(
    selectedProperty == null
      ? null
      : TypeExpression.unwrapArray(selectedProperty.valueType).base,
  )
  const unionTypeOptions = $derived(
    namedTypeOptions.filter((option) => option.kind !== 'signature'),
  )
  const signatureTypeOptions = $derived(
    namedTypeOptions.filter((option) => option.kind === 'signature'),
  )
  const selectedNamedTypeKind = $derived(
    selectedBase?.type === 'named'
    && (
      selectedBase.namedTypeKind === 'signature'
      || signatureTypeOptions.some((option) => option.value === selectedBase.namedTypeId)
    )
      ? 'signature'
      : 'union',
  )
  const selectedEditorBaseType = $derived(
    selectedBase?.type === 'named' && selectedNamedTypeKind === 'signature'
      ? 'signature'
      : selectedBase?.type ?? 'string',
  )
  const selectedArrayDepth = $derived(
    selectedProperty == null
      ? 0
      : TypeExpression.unwrapArray(selectedProperty.valueType).depth,
  )

  const emit = (
    nextProperties: TypeExpression.Property[],
    nextBaseObjectIds: string[] = $state.snapshot(baseObjectIds),
  ) => {
    const nextValue = JSON.stringify(ObjectShape.create(nextProperties, nextBaseObjectIds))
    properties = nextProperties
    baseObjectIds = nextBaseObjectIds
    serializedValue = nextValue
    onValueChange(nextValue)
  }

  const updateSelected = (
    update: (property: TypeExpression.Property) => void,
  ) => {
    if (selectedPath.length === 0) return
    const next = $state.snapshot(properties)
    const level = getLevel(next, selectedPath.slice(0, -1))
    const property = level?.[selectedPath.at(-1)!]
    if (property == null) return
    update(property)
    emit(next)
  }

  const createPropertyId = (siblings: readonly TypeExpression.Property[]): string => {
    const names = new Set(siblings.map((property) => property.id))
    let index = 0
    while (names.has(`property${index}`)) index += 1
    return `property${index}`
  }

  const addProperty = () => {
    const next = $state.snapshot(properties)
    const targetPath = selectedPath
    const level = getLevel(next, targetPath)
    if (level == null) return
    level.push(TypeExpression.createProperty(createPropertyId(level)))
    emit(next)
  }

  const deleteSelected = () => {
    if (selectedPath.length === 0) return
    const next = $state.snapshot(properties)
    const parentPath = selectedPath.slice(0, -1)
    const level = getLevel(next, parentPath)
    if (level == null) return
    level.splice(selectedPath.at(-1)!, 1)
    selectedPath = parentPath
    emit(next)
  }

  const setBaseType = (type: ObjectShapeBaseType) => {
    updateSelected((property) => {
      const { base, depth } = TypeExpression.unwrapArray(property.valueType)
      if (base.type === 'object' && base.properties.length > 0 && type !== 'object') return

      const nextBase: TypeExpression.Base = type === 'object'
        ? TypeExpression.createObject(base.type === 'object' ? base.properties : [])
        : type === 'reference'
          ? TypeExpression.createReference([objectOptions[0]?.value ?? ''])
          : type === 'named'
            ? TypeExpression.createNamed('')
            : type === 'signature'
              ? TypeExpression.createNamed('', 'signature')
            : TypeExpression.createPrimitive(type)
      property.valueType = TypeExpression.wrapArray(nextBase, depth)
    })
  }

  const setNamedType = (namedTypeId: string) => {
    updateSelected((property) => {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      if (base.type !== 'named') return
      base.namedTypeId = namedTypeId
      if (selectedNamedTypeKind === 'signature' && namedTypeId.length === 0) {
        base.namedTypeKind = 'signature'
      } else delete base.namedTypeKind
    })
  }

  const setReference = (index: number, objectTypeId: string) => {
    updateSelected((property) => {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      if (base.type !== 'reference') return
      base.objectTypeIds[index] = objectTypeId
    })
  }

  const addReference = () => {
    updateSelected((property) => {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      if (base.type !== 'reference') return
      const nextOption = objectOptions.find((option) => !base.objectTypeIds.includes(option.value))
      if (nextOption != null) base.objectTypeIds.push(nextOption.value)
    })
  }

  const removeReference = (index: number) => {
    updateSelected((property) => {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      if (base.type !== 'reference' || base.objectTypeIds.length <= 1) return
      base.objectTypeIds.splice(index, 1)
    })
  }

  const getReferenceOptions = (
    objectTypeIds: readonly string[],
    currentObjectTypeId: string,
  ) => objectOptions.filter((option) => (
    option.value === currentObjectTypeId || !objectTypeIds.includes(option.value)
  ))

  const setOptional = (optional: boolean) => {
    updateSelected((property) => {
      property.optional = optional
    })
  }

  const setNullable = (nullable: boolean) => {
    updateSelected((property) => {
      property.nullable = nullable
    })
  }

  const setLiteralUnion = (enabled: boolean) => {
    updateSelected((property) => {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      if (base.type !== 'string' && base.type !== 'number') return
      if (enabled) base.literals = []
      else delete base.literals
    })
  }

  const addLiteral = (literal: string | number) => {
    updateSelected((property) => {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      if (base.type === 'string' && base.literals != null) {
        base.literals.push(String(literal))
      }
      if (base.type === 'number' && base.literals != null) {
        base.literals.push(Number(literal))
      }
    })
  }

  const removeLiteral = (index: number) => {
    updateSelected((property) => {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      if ((base.type === 'string' || base.type === 'number') && base.literals != null) {
        base.literals.splice(index, 1)
      }
    })
  }

  const setArrayDepth = (depth: number) => {
    updateSelected((property) => {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      property.valueType = TypeExpression.wrapArray(
        base,
        Math.max(0, Math.min(32, Math.trunc(depth || 0))),
      )
    })
  }

  const getReferenceText = (objectTypeId: string): string => (
    objectOptions.find((option) => option.value === objectTypeId)?.label
      ?? 'MissingObject'
  )

  const getNamedTypeText = (namedTypeId: string): string => (
    namedTypeOptions.find((option) => option.value === namedTypeId)?.name
      ?? namedTypeOptions.find((option) => option.value === namedTypeId)?.label
      ?? 'MissingType'
  )

  const getNamedTypeDetail = (namedTypeId: string): string | undefined => (
    namedTypeOptions.find((option) => option.value === namedTypeId)?.detail
  )

  const getNamedTypeTitle = (namedTypeId: string): string | undefined => (
    namedTypeOptions.find((option) => option.value === namedTypeId)?.title
  )

  const getNamedTypePreview = (namedTypeId: string): string | undefined => (
    namedTypeOptions.find((option) => option.value === namedTypeId)?.preview
      ?? getNamedTypeTitle(namedTypeId)
  )

  const setBaseObject = (index: number, objectTypeId: string) => {
    const next = $state.snapshot(baseObjectIds)
    next[index] = objectTypeId
    emit($state.snapshot(properties), next)
  }

  const addBaseObject = () => {
    const nextOption = objectOptions.find((option) => !baseObjectIds.includes(option.value))
    if (nextOption == null) return
    emit($state.snapshot(properties), [...$state.snapshot(baseObjectIds), nextOption.value])
  }

  const removeBaseObject = (index: number) => {
    const next = $state.snapshot(baseObjectIds)
    next.splice(index, 1)
    emit($state.snapshot(properties), next)
  }

  const getArraySuffix = (property: TypeExpression.Property): string => (
    '[]'.repeat(TypeExpression.unwrapArray(property.valueType).depth)
  )
</script>

<div class="shape-editor">
  {#if errorMessage != null}
    <div class="shape-error">{errorMessage}</div>
  {/if}

  <div class="split-pane">
    <section class="tree-pane" aria-label="Object structure">
      <button
        type="button"
        class:active={selectedPath.length === 0}
        class="tree-row root-row"
          onclick={() => {
            selectedPath = []
          }}
      >
        <span class="type-keyword">type</span>
        <span class="type-name">{objectId.length > 0 ? objectId : '...'}</span>
        <span class="root-mark">&nbsp;=&nbsp;</span>
        {#each baseObjectIds as baseObjectId}
          <span class="base-type">{getReferenceText(baseObjectId)}</span>
          <span class="root-mark">&nbsp;&amp;&nbsp;</span>
        {/each}
        <span class="root-mark">{'{'}</span>
      </button>

      {#each rows as row (`${row.type}-${row.path.join('.')}`)}
        {#if row.type === 'property'}
          {@const base = TypeExpression.unwrapArray(row.property.valueType).base}
          <button
            type="button"
            class:active={pathsEqual(selectedPath, row.path)}
            class="tree-row property-row"
            style={`--depth: ${row.depth}`}
            onclick={() => {
              selectedPath = row.path
            }}
          >
            <span class="property-name">{row.property.id}</span>
            {#if row.property.optional}<span class="modifier-symbol">?</span>{/if}
            <span class="separator">:</span>
            {#if base.type === 'object'}
              <span class="brace">{'{'}</span>
            {:else if base.type === 'reference'}
              {#if base.objectTypeIds.length > 1 && getArraySuffix(row.property).length > 0}
                <span class="type-symbol">(</span>
              {/if}
              {#each base.objectTypeIds as objectTypeId, index}
                {#if index > 0}<span class="type-symbol">&nbsp;|&nbsp;</span>{/if}
                <span class="property-type reference-type">{getReferenceText(objectTypeId)}</span>
              {/each}
              {#if base.objectTypeIds.length > 1 && getArraySuffix(row.property).length > 0}
                <span class="type-symbol">)</span>
              {/if}
              <span class="array-suffix">{getArraySuffix(row.property)}</span>
              {#if row.property.nullable}<span class="type-symbol">&nbsp;| null</span>{/if}
            {:else if base.type === 'named'}
              <span class="property-type reference-type">{getNamedTypeText(base.namedTypeId)}</span>
              <span class="array-suffix">{getArraySuffix(row.property)}</span>
              {#if row.property.nullable}<span class="type-symbol">&nbsp;| null</span>{/if}
            {:else if (base.type === 'string' || base.type === 'number') && base.literals != null}
              {#if base.literals.length > 1 && getArraySuffix(row.property).length > 0}
                <span class="type-symbol">(</span>
              {/if}
              {#each base.literals as literal, index}
                {#if index > 0}<span class="type-symbol">&nbsp;|&nbsp;</span>{/if}
                <span class="property-type">{TypeLiteralLabel.format(literal)}</span>
              {/each}
              {#if base.literals.length > 1 && getArraySuffix(row.property).length > 0}
                <span class="type-symbol">)</span>
              {/if}
              <span class="array-suffix">{getArraySuffix(row.property)}</span>
              {#if row.property.nullable}<span class="type-symbol">&nbsp;| null</span>{/if}
            {:else}
              <span class="property-type">{base.type}</span>
              <span class="array-suffix">{getArraySuffix(row.property)}</span>
              {#if row.property.nullable}<span class="type-symbol">&nbsp;| null</span>{/if}
            {/if}
          </button>
        {:else}
          <div
            class="tree-row close-row"
            style={`--depth: ${row.depth}`}
            aria-hidden="true"
          >
            <span class="brace">{'}'}</span>
            <span class="array-suffix">{'[]'.repeat(row.arrayDepth)}</span>
            {#if row.nullable}<span class="type-symbol">&nbsp;| null</span>{/if}
          </div>
        {/if}
      {/each}

      <div class="tree-close">{'}'}</div>
    </section>

    <section class="detail-pane" aria-label="Selected property">
      <div class="detail-scroll">
        {#if selectedProperty == null}
          <h3>Object Root</h3>
          <p>{properties.length} properties</p>

          <div class="type-detail-field root-base-field">
            <span class="detail-label">Base Objects</span>
            <div class="reference-list">
              {#each baseObjectIds as baseObjectId, index}
                <div class="reference-row">
                  <select
                    value={baseObjectId}
                    aria-label={`Base Object ${index + 1}`}
                    onchange={(event) => setBaseObject(index, event.currentTarget.value)}
                  >
                    {#each getReferenceOptions(baseObjectIds, baseObjectId) as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                  <button
                    class="icon-button danger"
                    type="button"
                    title="Remove Base Object"
                    aria-label={`Remove Base Object ${index + 1}`}
                    onclick={() => removeBaseObject(index)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              {/each}
              <button
                class="command-button"
                type="button"
                disabled={baseObjectIds.length >= objectOptions.length}
                onclick={addBaseObject}
              >
                <Plus size={15} />
                Base Object
              </button>
            </div>
          </div>
        {:else}
          <h3>Property</h3>

        <label>
          <span>Name</span>
          <input
            type="text"
            value={selectedProperty.id}
            oninput={(event) => {
              updateSelected((property) => {
                property.id = event.currentTarget.value
              })
            }}
          />
        </label>

        <div class="modifier-fields">
          <label class="check-field">
            <input
              type="checkbox"
              checked={selectedProperty.optional}
              onchange={(event) => setOptional(event.currentTarget.checked)}
            />
            <span>Optional</span>
          </label>
          <label class="check-field">
            <input
              type="checkbox"
              checked={selectedProperty.nullable}
              onchange={(event) => setNullable(event.currentTarget.checked)}
            />
            <span>Nullable</span>
          </label>
        </div>

        <label>
          <span>Value Type</span>
          <select
            value={selectedEditorBaseType}
            onchange={(event) => setBaseType(event.currentTarget.value as ObjectShapeBaseType)}
          >
            {#each TypeExpression.primitiveTypes as type}
              <option
                value={type}
                disabled={selectedBase?.type === 'object' && selectedBase.properties.length > 0}
              >{type}</option>
            {/each}
            <option value="object">{TypeExpression.getBaseTypeLabel('object')}</option>
            <option
              value="reference"
              disabled={selectedBase?.type === 'object' && selectedBase.properties.length > 0}
            >{TypeExpression.getBaseTypeLabel('reference')}</option>
            <option
              value="named"
              disabled={selectedBase?.type === 'object' && selectedBase.properties.length > 0}
            >{TypeExpression.getBaseTypeLabel('named')}</option>
            <option
              value="signature"
              disabled={selectedBase?.type === 'object' && selectedBase.properties.length > 0}
            >Signature</option>
          </select>
        </label>

        {#if selectedBase?.type === 'reference'}
          <div class="type-detail-field">
            <span class="detail-label">Object Types</span>
            <div class="reference-list">
              {#each selectedBase.objectTypeIds as objectTypeId, index}
                <div class="reference-row">
                  <select
                    value={objectTypeId}
                    aria-label={`Object Type ${index + 1}`}
                    onchange={(event) => setReference(index, event.currentTarget.value)}
                  >
                    <option value=""></option>
                    {#each getReferenceOptions(selectedBase.objectTypeIds, objectTypeId) as option}
                      <option value={option.value}>{option.label ?? option.value}</option>
                    {/each}
                  </select>
                  <button
                    class="icon-button danger"
                    type="button"
                    title="Remove Object Type"
                    aria-label={`Remove Object Type ${index + 1}`}
                    disabled={selectedBase.objectTypeIds.length <= 1}
                    onclick={() => removeReference(index)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              {/each}
              <button
                class="command-button"
                type="button"
                disabled={selectedBase.objectTypeIds.length >= objectOptions.length}
                onclick={addReference}
              >
                <Plus size={15} />
                Object Type
              </button>
            </div>
          </div>
        {/if}

        {#if selectedBase?.type === 'named'}
          <label class="select-with-detail-row">
            <span>{selectedNamedTypeKind === 'signature' ? 'Signature' : 'Union'}</span>
            <span
              class="select-with-detail"
              class:signature-selection={selectedNamedTypeKind === 'signature'}
            >
              <select
                value={selectedBase.namedTypeId}
                onchange={(event) => setNamedType(event.currentTarget.value)}
              >
                <option value=""></option>
                {#each selectedNamedTypeKind === 'signature' ? signatureTypeOptions : unionTypeOptions as option}
                  <option value={option.value}>{option.name ?? option.label ?? option.value}</option>
                {/each}
              </select>
              {#if selectedNamedTypeKind === 'signature'}
                <SignatureReferencePreview text={getNamedTypePreview(selectedBase.namedTypeId)} />
              {:else}
                <SignatureReferencePreview
                  text={getNamedTypeTitle(selectedBase.namedTypeId) ?? getNamedTypeDetail(selectedBase.namedTypeId)}
                />
              {/if}
            </span>
          </label>
        {/if}

        {#if selectedBase?.type === 'string' || selectedBase?.type === 'number'}
          <div class="type-detail-field">
            <label class="check-field">
              <input
                type="checkbox"
                checked={selectedBase.literals != null}
                onchange={(event) => setLiteralUnion(event.currentTarget.checked)}
              />
              <span>Literal Union</span>
            </label>
            {#if selectedBase.literals != null}
              <LiteralUnionDraftEditor
                valueType={selectedBase.type}
                values={selectedBase.literals}
                onAdd={addLiteral}
                onRemove={removeLiteral}
              />
            {/if}
          </div>
        {/if}

        <label>
          <span>Array Depth</span>
          <input
            class="depth-input"
            type="number"
            min="0"
            max="32"
            step="1"
            value={selectedArrayDepth}
            oninput={(event) => setArrayDepth(Number(event.currentTarget.value))}
          />
        </label>

        {/if}
      </div>

      <footer class="operation-footer">
        {#if selectedProperty == null}
          <button class="command-button" type="button" onclick={addProperty}>
            <Plus size={15} />
            Add Property
          </button>
        {:else}
          <button class="icon-button danger" type="button" title="Delete property" onclick={deleteSelected}>
            <Trash2 size={16} />
          </button>
          {#if selectedBase?.type === 'object'}
            <button class="command-button" type="button" onclick={addProperty}>
              <Plus size={15} />
              Add Property
            </button>
          {/if}
        {/if}
      </footer>
    </section>
  </div>
</div>

<style>
  .shape-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    color: #2b4850;
    font-size: 13px;
  }

  .shape-error {
    padding: 0 0 7px;
    color: #b94755;
    font-weight: 700;
  }

  .split-pane {
    display: grid;
    grid-template-columns: minmax(280px, 42%) minmax(320px, 1fr);
    flex: 1 1 auto;
    height: 100%;
    min-height: 0;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: rgba(250, 253, 254, 0.72);
    overflow: hidden;
  }

  .tree-pane,
  .detail-pane {
    min-width: 0;
    min-height: 0;
    height: 100%;
  }

  .tree-pane {
    padding: 8px 0 16px;
    border-right: 1px solid var(--mbc-color-border-strong);
    background: #eef8fa;
    overflow: auto;
  }

  .tree-row {
    display: flex;
    align-items: center;
    width: 100%;
    height: 30px;
    min-width: max-content;
    padding: 0 12px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #36545b;
    font: inherit;
    text-align: left;
  }

  .tree-row:hover {
    background: #dff2f5;
  }

  .tree-row.active {
    background: #c9edf2;
  }

  .property-row {
    padding-left: calc(12px + var(--depth) * 18px);
  }

  .type-keyword,
  .separator,
  .root-mark {
    color: #67858c;
  }

  .type-name {
    margin-left: 6px;
  }

  .type-name,
  .property-name {
    color: #287985;
    font-weight: 700;
  }

  .root-mark {
    margin-left: 0;
  }

  .base-type {
    color: #438765;
    font-weight: 700;
  }

  .separator {
    margin: 0 6px 0 2px;
  }

  .property-type {
    color: #a67a1c;
    font-weight: 700;
  }

  .property-type.reference-type {
    color: #438765;
  }

  .array-suffix {
    color: #67858c;
    font-weight: 400;
  }

  .modifier-symbol,
  .type-symbol {
    color: #67858c;
    font-weight: 400;
  }

  .brace {
    color: #67858c;
  }

  .close-row {
    padding-left: calc(12px + var(--depth) * 18px);
    pointer-events: none;
  }

  .tree-close {
    height: 28px;
    padding-left: 12px;
    color: #67858c;
    line-height: 28px;
  }

  .detail-pane {
    display: grid;
    grid-template-rows: minmax(0, 1fr) min-content;
    overflow: hidden;
  }

  .detail-scroll {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 20px;
    min-height: 0;
    overflow: auto;
    scrollbar-gutter: stable;
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 15px;
  }

  p {
    color: #69858b;
  }

  label {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    font-weight: 700;
  }

  .select-with-detail-row {
    align-items: start;
  }

  .select-with-detail {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .select-with-detail.signature-selection {
    display: grid;
    gap: 7px;
  }

  .modifier-fields {
    display: flex;
    align-items: center;
    gap: 18px;
    min-height: 32px;
  }

  .check-field {
    display: inline-flex;
    grid-template-columns: none;
    align-items: center;
    gap: 7px;
    width: fit-content;
  }

  .check-field input {
    width: 16px;
    height: 16px;
    padding: 0;
  }

  .type-detail-field {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
  }

  .root-base-field {
    margin-top: 4px;
  }

  .detail-label {
    padding-top: 8px;
    font-weight: 700;
  }

  .reference-list {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .reference-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 32px;
    gap: 4px;
  }

  input,
  select {
    min-width: 0;
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

  .operation-footer {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 57px;
    padding: 12px 20px;
    border-top: 1px solid var(--mbc-color-border-strong);
    background: rgba(238, 248, 250, 0.92);
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
