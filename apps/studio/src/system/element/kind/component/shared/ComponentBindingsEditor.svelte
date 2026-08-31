<script lang="ts">
  import CompactFormulaField from '../../../../ui/formula/CompactFormulaField.svelte'
  import FormulaModeToggle from '../../../../ui/formula/FormulaModeToggle.svelte'
  import TypeCatalog from '../../type/type-catalog'
  import TypeExpression from '../../type/type-expression'
  import TreeStore from '../../../../store/tree-store'
  import ComponentReference from './component-reference'

  type Props = {
    componentId: string
    value: string
    components: readonly ComponentReference.Option[]
    injectionSource?: string
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let {
    componentId,
    value,
    components,
    injectionSource,
    errorMessage,
    onValueChange,
  }: Props = $props()

  const rootNodeStore = TreeStore.rootNode
  const component = $derived(components.find((candidate) => candidate.componentId === componentId))
  const parsedBindings = $derived(ComponentReference.parseBindings(value) ?? [])
  const bindings = $derived(ComponentReference.normalizeBindings(parsedBindings, component))

  $effect(() => {
    const normalizedValue = ComponentReference.stringifyBindings(bindings)
    if (value !== normalizedValue) onValueChange(normalizedValue)
  })

  const getBinding = (
    propId: string,
  ): ComponentReference.ValueBinding | undefined => (
    bindings.find((binding) => binding.propId === propId)
  )

  const emit = (
    nextBindings: readonly ComponentReference.Binding[],
  ) => onValueChange(ComponentReference.stringifyBindings(nextBindings))

  const updateBinding = (
    propId: string,
    source: ComponentReference.ValueBindingSource | null,
  ) => {
    const nextBindings = bindings.filter((binding) => binding.propId !== propId)
    if (source != null) nextBindings.push({ propId, kind: 'value', source })
    emit(nextBindings)
  }

  const getEmptySource = (
    prop: NonNullable<typeof component>['props'][number],
  ): ComponentReference.ValueBindingSource => {
    const { base, depth } = TypeExpression.unwrapArray(prop.valueType)
    return depth === 0 && TypeExpression.primitiveTypes.includes(base.type as TypeExpression.PrimitiveName)
      ? { type: 'literal', value: '' }
      : { type: 'formula', source: '' }
  }

  const getTypeText = (
    prop: NonNullable<typeof component>['props'][number],
  ): string => `${TypeExpression.getTypeText(
    prop.valueType,
    (typeId) => TypeCatalog.resolveTypeName($rootNodeStore, typeId),
  )}${prop.nullable ? ' | null' : ''}`

  const getExpectedTypeText = (
    prop: NonNullable<typeof component>['props'][number],
  ): string => `${TypeExpression.getTypeText(
    prop.valueType,
    (typeId) => TypeCatalog.resolveTypeScriptName($rootNodeStore, typeId),
  )}${prop.nullable ? ' | null' : ''}`

  const isLiteralAvailable = (
    prop: NonNullable<typeof component>['props'][number],
  ): boolean => {
    const { base, depth } = TypeExpression.unwrapArray(prop.valueType)
    return depth === 0 && TypeExpression.primitiveTypes.includes(base.type as TypeExpression.PrimitiveName)
  }

  const getExpectedType = (
    prop: NonNullable<typeof component>['props'][number],
  ): 'string' | 'number' | 'boolean' | undefined => {
    const { base } = TypeExpression.unwrapArray(prop.valueType)
    return isLiteralAvailable(prop)
      ? base.type as 'string' | 'number' | 'boolean'
      : undefined
  }
</script>

<div class="bindings-editor" data-validation-severity={errorMessage == null ? undefined : 'error'}>
  {#if componentId.length === 0}
    <div class="empty-state">Select a Component to configure its Props.</div>
  {:else if component == null}
    <div class="empty-state error-state">The selected Component was not found.</div>
  {:else if component.props.length === 0}
    <div class="empty-state">This Component has no Value Props.</div>
  {:else}
    <div class="bindings-header" aria-hidden="true">
      <span>Prop</span>
      <span>Resolution</span>
      <span>Value</span>
    </div>
    <div class="bindings-list">
      {#each component.props as prop (prop.propId)}
        {@const binding = getBinding(prop.propId)}
        {@const source = binding?.source ?? getEmptySource(prop)}
        {@const literalAvailable = isLiteralAvailable(prop)}
        <div class="binding-row" class:invalid={binding == null && prop.defaultValue == null}>
          <div class="prop-info">
            <span class="prop-name">{prop.id}</span>
            <span class="prop-type">{getTypeText(prop)}</span>
          </div>

          {#if prop.defaultValue != null}
            <select
              class="resolution-select"
              aria-label={`${prop.id} resolution`}
              value={binding == null ? 'default' : 'value'}
              onchange={(event) => {
                updateBinding(
                  prop.propId,
                  event.currentTarget.value === 'default' ? null : getEmptySource(prop),
                )
              }}
            >
              <option value="default">Default</option>
              <option value="value">Set Value</option>
            </select>
          {:else}
            <span class="required-resolution">Set Value</span>
          {/if}

          {#if binding == null && prop.defaultValue != null}
            <span class="default-value">Component default</span>
          {:else}
            <div class:formula-only={!literalAvailable} class="value-editor">
              {#if literalAvailable}
                <FormulaModeToggle
                  mode={source.type}
                  onModeChange={(mode) => updateBinding(
                    prop.propId,
                    mode === 'literal'
                      ? { type: 'literal', value: '' }
                      : { type: 'formula', source: '' },
                  )}
                />
              {/if}

              {#if source.type === 'formula'}
                <CompactFormulaField
                  value={source.source}
                  ariaLabel={`${prop.id} formula`}
                  {injectionSource}
                  expectedType={getExpectedType(prop)}
                  expectedTypeText={getExpectedTypeText(prop)}
                  onValueChange={(formulaSource) => updateBinding(
                    prop.propId,
                    { type: 'formula', source: formulaSource },
                  )}
                />
              {:else if TypeExpression.unwrapArray(prop.valueType).base.type === 'boolean'}
                <select
                  class="literal-input"
                  aria-label={`${prop.id} literal value`}
                  value={source.value}
                  onchange={(event) => updateBinding(
                    prop.propId,
                    { type: 'literal', value: event.currentTarget.value },
                  )}
                >
                  <option value=""></option>
                  <option value="false">false</option>
                  <option value="true">true</option>
                </select>
              {:else}
                <input
                  class="literal-input"
                  type={TypeExpression.unwrapArray(prop.valueType).base.type === 'number' ? 'number' : 'text'}
                  aria-label={`${prop.id} literal value`}
                  value={source.value}
                  oninput={(event) => updateBinding(
                    prop.propId,
                    { type: 'literal', value: event.currentTarget.value },
                  )}
                />
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .bindings-editor {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: rgba(248, 253, 254, 0.82);
    overflow: hidden;
  }

  .bindings-editor[data-validation-severity='error'] {
    border-color: #d58e8e;
  }

  .bindings-header,
  .binding-row {
    display: grid;
    grid-template-columns: minmax(150px, 0.8fr) 120px minmax(220px, 1.5fr);
    align-items: center;
    gap: var(--mbc-form-column-gap);
  }

  .bindings-header {
    padding: 8px 10px 6px;
    border-bottom: 1px solid rgba(154, 203, 212, 0.58);
    color: #66838a;
    font-size: 11px;
    font-weight: 700;
  }

  .bindings-list {
    min-height: 0;
    max-height: 260px;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }

  .binding-row {
    min-height: 44px;
    padding: 5px 10px;
    border-bottom: 1px solid rgba(154, 203, 212, 0.42);
    box-sizing: border-box;
  }

  .binding-row:last-child {
    border-bottom: 0;
  }

  .binding-row.invalid {
    background: rgba(255, 245, 223, 0.62);
  }

  .prop-info {
    display: flex;
    align-items: baseline;
    gap: 7px;
    min-width: 0;
  }

  .prop-name {
    color: #557f3d;
    font-size: 13px;
    font-weight: 700;
  }

  .prop-type {
    color: #a07716;
    font-size: 11px;
    font-weight: 700;
  }

  .resolution-select,
  .literal-input,
  .required-resolution,
  .default-value {
    width: 100%;
    height: 32px;
    box-sizing: border-box;
  }

  .resolution-select,
  .literal-input {
    padding: 0 9px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 13px;
    outline: none;
  }

  .resolution-select:focus,
  .literal-input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .required-resolution,
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

  .value-editor {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: var(--mbc-form-control-gap);
    min-width: 0;
  }

  .value-editor.formula-only {
    grid-template-columns: minmax(0, 1fr);
  }

  .empty-state {
    display: flex;
    align-items: center;
    min-height: 52px;
    padding: 0 12px;
    color: #6d8990;
    font-size: 13px;
  }

  .error-state {
    color: #a54d55;
  }
</style>
