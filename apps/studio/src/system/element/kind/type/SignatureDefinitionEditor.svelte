<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte'
  import SignatureDefinition from './signature-definition'
  import TypeExpression from './type-expression'
  import ValueTypeDefinition from './value-type-definition'
  import ValueTypeEditor from './ValueTypeEditor.svelte'

  type Option = {
    value: string
    label?: string
    name?: string
    detail?: string
    title?: string
    preview?: string
    kind?: 'union' | 'signature'
  }

  type Props = {
    signatureId: string
    value: string
    objectOptions: readonly Option[]
    namedTypeOptions: readonly Option[]
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let {
    signatureId,
    value,
    objectOptions,
    namedTypeOptions,
    errorMessage = null,
    onValueChange,
  }: Props = $props()

  let definition = $state<SignatureDefinition.Definition>(SignatureDefinition.create())
  let serializedValue = $state('')
  let selected = $state<'root' | 'return' | number>('root')

  $effect(() => {
    if (value === serializedValue) return
    definition = SignatureDefinition.parse(value) ?? SignatureDefinition.create()
    serializedValue = value
    selected = 'root'
  })

  const selectedParameter = $derived(
    typeof selected === 'number' ? definition.parameters[selected] ?? null : null,
  )

  const emit = (next: SignatureDefinition.Definition) => {
    const nextValue = SignatureDefinition.stringify(next)
    definition = next
    serializedValue = nextValue
    onValueChange(nextValue)
  }

  const createParameterName = (): string => {
    const names = new Set(definition.parameters.map((parameter) => parameter.id))
    let index = 1
    while (names.has(`param${index}`)) index += 1
    return `param${index}`
  }

  const addParameter = () => {
    const next = $state.snapshot(definition)
    const parameter = SignatureDefinition.createParameter(createParameterName())
    next.parameters.push(parameter)
    emit(next)
    selected = next.parameters.length - 1
  }

  const updateSelectedParameter = (
    update: (parameter: SignatureDefinition.Parameter) => void,
  ) => {
    const next = $state.snapshot(definition)
    const parameter = typeof selected === 'number' ? next.parameters[selected] : null
    if (parameter == null) return
    update(parameter)
    emit(next)
  }

  const deleteSelectedParameter = () => {
    const next = $state.snapshot(definition)
    if (typeof selected !== 'number' || next.parameters[selected] == null) return
    next.parameters.splice(selected, 1)
    emit(next)
    selected = 'root'
  }

  const updateParameterValueType = (source: string) => {
    const valueType = ValueTypeDefinition.parse(source)
    if (valueType == null) return
    updateSelectedParameter((parameter) => {
      parameter.valueType = valueType.valueType
      parameter.nullable = valueType.nullable
    })
  }

  const setVoidReturn = (voidReturn: boolean) => {
    const next = $state.snapshot(definition)
    next.returnType = voidReturn ? null : ValueTypeDefinition.create()
    emit(next)
  }

  const setAsync = (async: boolean) => {
    const next = $state.snapshot(definition)
    next.async = async
    emit(next)
  }

  const updateReturnType = (source: string) => {
    const returnType = ValueTypeDefinition.parse(source)
    if (returnType == null) return
    const next = $state.snapshot(definition)
    next.returnType = returnType
    emit(next)
  }

  const resolveTypeName = (typeId: string): string | undefined => (
    objectOptions.find((option) => option.value === typeId)?.label
    ?? namedTypeOptions.find((option) => option.value === typeId)?.name
    ?? namedTypeOptions.find((option) => option.value === typeId)?.label
  )

  const getParameterTypeText = (
    parameter: SignatureDefinition.Parameter,
  ): string => `${TypeExpression.getTypeText(
    parameter.valueType,
    resolveTypeName,
  )}${parameter.nullable ? ' | null' : ''}`

  const getReturnTypeText = (): string => {
    const valueType = definition.returnType == null
      ? 'void'
      : ValueTypeDefinition.getTypeText(definition.returnType, resolveTypeName)
    return definition.async ? `Promise<${valueType}>` : valueType
  }
</script>

<div class="signature-editor">
  {#if errorMessage != null}
    <div class="signature-error">{errorMessage}</div>
  {/if}

  <label class="async-field">
    <span>Async</span>
    <input
      type="checkbox"
      checked={definition.async}
      onchange={(event) => setAsync(event.currentTarget.checked)}
    />
  </label>

  <div class="split-pane">
    <section class="tree-pane" aria-label="Signature structure">
      <button
        type="button"
        class:active={selected === 'root'}
        class="tree-row root-row"
        onclick={() => {
          selected = 'root'
        }}
      >
        <span class="type-keyword">type</span>
        <span class="type-name">{signatureId.length > 0 ? signatureId : '...'}</span>
        <span class="type-symbol">&nbsp;=&nbsp;(</span>
      </button>

      {#each definition.parameters as parameter, index (index)}
        <button
          type="button"
          class:active={selected === index}
          class="tree-row parameter-row"
          onclick={() => {
            selected = index
          }}
        >
          <span class="parameter-name">{parameter.id}</span>
          <span class="separator">:</span>
          <span class="parameter-type">{getParameterTypeText(parameter)}</span>
          <span class="type-symbol">,</span>
        </button>
      {/each}

      <button
        type="button"
        class:active={selected === 'return'}
        class="tree-row return-row"
        onclick={() => {
          selected = 'return'
        }}
      >
        <span class="type-symbol">):&nbsp;</span>
        <span class="return-type">{getReturnTypeText()}</span>
      </button>
    </section>

    <section class="detail-pane" aria-label="Selected signature member">
      <div class="detail-scroll">
        {#if selected === 'root'}
          <h3>Signature</h3>
          <p>{definition.parameters.length} parameters</p>
        {:else if selected === 'return'}
          <h3>Return Type</h3>
          <label class="check-field">
            <input
              type="checkbox"
              checked={definition.returnType == null}
              onchange={(event) => setVoidReturn(event.currentTarget.checked)}
            />
            <span>Void</span>
          </label>
          {#if definition.returnType != null}
            <ValueTypeEditor
              value={ValueTypeDefinition.stringify(definition.returnType)}
              {objectOptions}
              {namedTypeOptions}
              onValueChange={updateReturnType}
            />
          {/if}
        {:else if selectedParameter != null}
          <h3>Parameter</h3>
          <label>
            <span>Name</span>
            <input
              type="text"
              value={selectedParameter.id}
              oninput={(event) => {
                updateSelectedParameter((parameter) => {
                  parameter.id = event.currentTarget.value
                })
              }}
            />
          </label>
          <ValueTypeEditor
            value={ValueTypeDefinition.stringify({
              valueType: selectedParameter.valueType,
              nullable: selectedParameter.nullable,
            })}
            {objectOptions}
            {namedTypeOptions}
            onValueChange={updateParameterValueType}
          />
        {/if}
      </div>

      <footer class="operation-footer">
        {#if selected === 'root'}
          <button class="command-button" type="button" onclick={addParameter}>
            <Plus size={15} />
            Add Parameter
          </button>
        {:else if selectedParameter != null}
          <button
            class="icon-button danger"
            type="button"
            title="Delete parameter"
            aria-label="Delete parameter"
            onclick={deleteSelectedParameter}
          >
            <Trash2 size={16} />
          </button>
        {/if}
      </footer>
    </section>
  </div>
</div>

<style>
  .signature-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    color: #2b4850;
    font-size: 13px;
  }

  .signature-error {
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

  .async-field {
    display: inline-flex;
    grid-template-columns: none;
    gap: 7px;
    width: fit-content;
    margin-bottom: 14px;
  }

  .async-field input {
    width: 16px;
    height: 16px;
    padding: 0;
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

  .parameter-row {
    padding-left: 30px;
  }

  .type-keyword,
  .type-symbol,
  .separator {
    color: #67858c;
  }

  .type-name,
  .parameter-name {
    color: #287985;
    font-weight: 700;
  }

  .type-name {
    margin-left: 6px;
  }

  .separator {
    margin: 0 6px 0 2px;
  }

  .parameter-type,
  .return-type {
    color: #438765;
    font-weight: 700;
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
    min-height: 0;
    padding: 18px 20px;
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

  .check-field {
    display: inline-flex;
    grid-template-columns: none;
    gap: 7px;
    width: fit-content;
  }

  .check-field input {
    width: 16px;
    height: 16px;
    padding: 0;
  }

  input:not([type='checkbox']) {
    min-width: 0;
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: #fff;
    color: #2b4850;
    font: inherit;
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
</style>
