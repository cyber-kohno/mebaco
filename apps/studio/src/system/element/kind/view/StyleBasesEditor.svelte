<script lang="ts">
  import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
  import CompactFormulaField from '../../../ui/formula/CompactFormulaField.svelte'
  import FormulaModeToggle from '../../../ui/formula/FormulaModeToggle.svelte'
  import StyleElement from './style-element'
  import type StyleResolver from './style-resolver'

  type Props = {
    value: string
    options: readonly ElementEditSchema.SelectOption[]
    getResolution?: (styleId: string) => StyleResolver.Result
    formulaInjectionSource?: string
    usage?: 'inheritance' | 'application'
    onValueChange: (value: string) => void
  }

  let {
    value,
    options,
    getResolution,
    formulaInjectionSource,
    usage = 'inheritance',
    onValueChange,
  }: Props = $props()

  let bases = $state<StyleElement.Base[]>([])
  let lastValue = $state('')

  const emit = () => {
    lastValue = JSON.stringify(bases)
    onValueChange(lastValue)
  }

  $effect(() => {
    if (value === lastValue) return
    bases = StyleElement.parseBases(value)
    lastValue = value
  })

  const addBase = () => {
    bases = [...bases, StyleElement.createBase()]
    emit()
  }

  const updateBase = (
    referenceId: string,
    patch: Partial<StyleElement.Base>,
  ) => {
    bases = bases.map((base) => (
      base.referenceId === referenceId ? { ...base, ...patch } : base
    ))
    emit()
  }

  const cloneBase = (
    index: number,
  ) => {
    const source = bases[index]
    const clone: StyleElement.Base = {
      ...source,
      referenceId: crypto.randomUUID(),
      condition: source.condition == null ? undefined : { ...source.condition },
      arguments: structuredClone(source.arguments),
    }
    bases = [...bases.slice(0, index + 1), clone, ...bases.slice(index + 1)]
    emit()
  }

  const deleteBase = (
    referenceId: string,
  ) => {
    bases = bases.filter((base) => base.referenceId !== referenceId)
    emit()
  }

  const moveBase = (
    index: number,
    offset: -1 | 1,
  ) => {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= bases.length) return

    const nextBases = [...bases]
    const current = nextBases[index]
    nextBases[index] = nextBases[nextIndex]
    nextBases[nextIndex] = current
    bases = nextBases
    emit()
  }

  const setConditionEnabled = (
    referenceId: string,
    enabled: boolean,
  ) => {
    updateBase(referenceId, {
      condition: enabled ? { type: 'formula', source: 'true' } : undefined,
    })
  }

  const updateCondition = (
    referenceId: string,
    source: string,
  ) => {
    updateBase(referenceId, {
      condition: { type: 'formula', source },
    })
  }

  const getBaseResolution = (
    base: StyleElement.Base,
  ): StyleResolver.Result => (
    base.styleId.length === 0 || getResolution == null
      ? { parameters: [], issues: [] }
      : getResolution(base.styleId)
  )

  const getArgument = (
    base: StyleElement.Base,
    parameter: StyleResolver.Parameter,
  ): StyleElement.Argument => (
    base.arguments.find((argument) => argument.parameterId === parameter.parameterId)
    ?? {
      parameterId: parameter.parameterId,
      binding: usage === 'inheritance'
        ? { type: 'delegate' }
        : parameter.defaultValue === undefined
          ? { type: 'value', value: { type: 'literal', value: '' } }
          : { type: 'default' },
    }
  )

  const createApplicationArguments = (
    styleId: string,
  ): StyleElement.Argument[] => {
    if (styleId.length === 0 || getResolution == null) return []

    return getResolution(styleId).parameters.map((parameter) => ({
      parameterId: parameter.parameterId,
      binding: parameter.defaultValue === undefined
        ? { type: 'value', value: { type: 'literal', value: '' } }
        : { type: 'default' },
    }))
  }

  const updateArgument = (
    base: StyleElement.Base,
    parameterId: string,
    binding: StyleElement.ArgumentBinding,
  ) => {
    const nextArgument: StyleElement.Argument = {
      parameterId,
      binding,
    }
    const hasArgument = base.arguments.some((argument) => (
      argument.parameterId === parameterId
    ))
    const nextArguments = hasArgument
      ? base.arguments.map((argument) => (
          argument.parameterId === parameterId ? nextArgument : argument
        ))
      : [...base.arguments, nextArgument]

    updateBase(base.referenceId, { arguments: nextArguments })
  }

  const createLiteral = (
    valueType: StyleResolver.Parameter['valueType'],
  ): StyleElement.ParameterValue => {
    switch (valueType) {
      case 'number':
        return { type: 'literal', value: 0 }
      case 'boolean':
        return { type: 'literal', value: false }
      case 'string':
        return { type: 'literal', value: '' }
    }
  }

  const updateBinding = (
    base: StyleElement.Base,
    parameter: StyleResolver.Parameter,
    type: StyleElement.ArgumentBinding['type'],
  ) => {
    switch (type) {
      case 'default':
        updateArgument(base, parameter.parameterId, { type: 'default' })
        break
      case 'value':
        updateArgument(base, parameter.parameterId, {
          type: 'value',
          value: createLiteral(parameter.valueType),
        })
        break
      case 'delegate':
        updateArgument(base, parameter.parameterId, { type: 'delegate' })
        break
    }
  }

  const updateValueMode = (
    base: StyleElement.Base,
    parameter: StyleResolver.Parameter,
    type: StyleElement.ParameterValue['type'],
  ) => {
    updateArgument(base, parameter.parameterId, {
      type: 'value',
      value: type === 'formula'
        ? { type: 'formula', source: '' }
        : createLiteral(parameter.valueType),
    })
  }

  const updateLiteral = (
    base: StyleElement.Base,
    parameter: StyleResolver.Parameter,
    value: string,
  ) => {
    const literal = parameter.valueType === 'number' && value.length > 0
      ? Number(value)
      : value
    updateArgument(base, parameter.parameterId, {
      type: 'value',
      value: { type: 'literal', value: literal },
    })
  }
</script>

<section class="style-bases" aria-label={usage === 'inheritance' ? 'Style inheritance' : 'Applied styles'}>
  <div class="style-bases-header">
    <span>{usage === 'inheritance' ? 'Earlier definitions are applied first.' : 'Later definitions take precedence.'}</span>
    <button type="button" disabled={options.length === 0} onclick={addBase}>Add</button>
  </div>

  {#if options.length === 0}
    <div class="empty">No styles available</div>
  {:else if bases.length === 0}
    <div class="empty">{usage === 'inheritance' ? 'No inherited styles' : 'No applied styles'}</div>
  {:else}
    <div class="base-area">
      {#each bases as base, index (base.referenceId)}
        {@const resolution = getBaseResolution(base)}
        <article class="base-record">
          <div class="base-toolbar">
            <span>{usage === 'inheritance' ? 'Base' : 'Style'} {index + 1}</span>
            <div class="row-actions">
              <button type="button" disabled={index === 0} onclick={() => moveBase(index, -1)}>Up</button>
              <button type="button" disabled={index === bases.length - 1} onclick={() => moveBase(index, 1)}>Down</button>
              <button type="button" onclick={() => cloneBase(index)}>Clone</button>
              <button type="button" onclick={() => deleteBase(base.referenceId)}>Delete</button>
            </div>
          </div>

          <label class="base-field style-field">
            <span>Style</span>
            <select
              value={base.styleId}
              onchange={(event) => {
                updateBase(base.referenceId, {
                  styleId: event.currentTarget.value,
                  arguments: usage === 'application'
                    ? createApplicationArguments(event.currentTarget.value)
                    : [],
                })
              }}
            >
              <option value=""></option>
              {#each options as option}
                <option value={option.value}>{option.label ?? option.value}</option>
              {/each}
            </select>
          </label>

          <div class="condition-field">
            <label class="condition-toggle">
              <input
                type="checkbox"
                checked={base.condition != null}
                onchange={(event) => setConditionEnabled(base.referenceId, event.currentTarget.checked)}
              />
              <span>Condition</span>
            </label>
            {#if base.condition != null}
              <CompactFormulaField
                value={base.condition.source}
                ariaLabel="Style condition"
                injectionSource={formulaInjectionSource}
                expectedType="boolean"
                onValueChange={(source) => updateCondition(base.referenceId, source)}
              />
            {/if}
          </div>

          {#if resolution.issues.length > 0}
            <div class="resolution-errors" role="alert">
              {#each resolution.issues as issue}
                <div>{issue.message}</div>
              {/each}
            </div>
          {:else if resolution.parameters.length > 0}
            <div class="parameter-list">
              <div class="parameter-head">Parameter</div>
              <div class="parameter-head">Binding</div>
              <div class="parameter-head">Value</div>

              {#each resolution.parameters as parameter (`${base.referenceId}-${parameter.sourceStyleId}-${parameter.parameterId}`)}
                {@const argument = getArgument(base, parameter)}
                <div class="parameter-name">
                  <span class="parameter-id">{parameter.parameterId}</span>
                  <span class="parameter-type">{parameter.valueType}</span>
                  <span class="parameter-source">from {parameter.sourceStyleId}</span>
                </div>
                <select
                  value={argument.binding.type}
                  onchange={(event) => updateBinding(
                    base,
                    parameter,
                    event.currentTarget.value as StyleElement.ArgumentBinding['type'],
                  )}
                >
                  {#if usage === 'inheritance'}
                    <option value="delegate">Delegate</option>
                  {/if}
                  <option value="default" disabled={parameter.defaultValue === undefined}>Default</option>
                  <option value="value">Set Value</option>
                </select>
                <div class="parameter-value">
                  {#if argument.binding.type === 'delegate'}
                    <span class="read-only-value">Required by caller</span>
                  {:else if argument.binding.type === 'default'}
                    <span class="read-only-value">{String(parameter.defaultValue ?? '')}</span>
                  {:else}
                    <div class="specified-value">
                      <FormulaModeToggle
                        mode={argument.binding.value.type}
                        onModeChange={(type) => updateValueMode(base, parameter, type)}
                      />
                      {#if argument.binding.value.type === 'formula'}
                        <CompactFormulaField
                          value={argument.binding.value.source}
                          ariaLabel={`${parameter.parameterId} formula`}
                          injectionSource={formulaInjectionSource}
                          expectedType={parameter.valueType}
                          onValueChange={(source) => updateArgument(base, parameter.parameterId, {
                            type: 'value',
                            value: { type: 'formula', source },
                          })}
                        />
                      {:else if parameter.valueType === 'boolean'}
                        <select
                          value={String(argument.binding.value.value)}
                          onchange={(event) => updateArgument(base, parameter.parameterId, {
                            type: 'value',
                            value: {
                              type: 'literal',
                              value: event.currentTarget.value === 'true',
                            },
                          })}
                        >
                          {#if typeof argument.binding.value.value !== 'boolean'}
                            <option value=""></option>
                          {/if}
                          <option value="false">false</option>
                          <option value="true">true</option>
                        </select>
                      {:else}
                        <input
                          type={parameter.valueType === 'number' ? 'number' : 'text'}
                          value={String(argument.binding.value.value)}
                          oninput={(event) => updateLiteral(base, parameter, event.currentTarget.value)}
                        />
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .style-bases {
    display: grid;
    grid-template-rows: min-content minmax(0, 1fr);
    gap: 10px;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .style-bases-header,
  .base-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #496970;
    font-size: 12px;
    font-weight: 700;
  }

  button {
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: default;
  }

  button:disabled {
    opacity: 0.4;
  }

  button:not(:disabled):hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }

  .empty {
    height: 100%;
    min-height: 0;
    padding: 12px;
    border: 1px solid rgba(154, 203, 212, 0.68);
    border-radius: 6px;
    background: rgba(244, 251, 252, 0.8);
    color: #6d8990;
    font-size: 13px;
    box-sizing: border-box;
  }

  .base-area {
    display: grid;
    align-content: start;
    gap: 10px;
    height: 100%;
    min-height: 0;
    padding-right: 4px;
    overflow: auto;
    box-sizing: border-box;
  }

  .base-record {
    display: grid;
    gap: 10px;
    padding: 10px;
    border: 1px solid rgba(154, 203, 212, 0.82);
    border-radius: 6px;
    background: rgba(244, 251, 252, 0.76);
  }

  .base-toolbar {
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(154, 203, 212, 0.5);
  }

  .row-actions {
    display: flex;
    gap: 5px;
  }

  .base-field {
    display: grid;
    gap: 6px;
    color: #496970;
    font-size: 12px;
    font-weight: 700;
  }

  .style-field {
    grid-template-columns: 72px minmax(0, 1fr);
    align-items: center;
    width: min(100%, var(--mbc-width-id-field));
  }

  .condition-field {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    height: 32px;
  }

  .condition-toggle {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #496970;
    font-size: 12px;
    font-weight: 700;
  }

  .condition-toggle input {
    width: 16px;
    height: 16px;
  }

  .parameter-list {
    display: grid;
    grid-template-columns: minmax(120px, 0.7fr) 110px minmax(220px, 1.3fr);
    gap: 6px;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid rgba(154, 203, 212, 0.5);
  }

  .parameter-head {
    color: #6d8990;
    font-size: 11px;
    font-weight: 700;
  }

  .parameter-name {
    display: flex;
    align-items: baseline;
    gap: 5px;
    min-width: 0;
    font-size: 12px;
    font-weight: 700;
  }

  .parameter-id {
    color: #66892e;
  }

  .parameter-type {
    color: #9b7a26;
  }

  .parameter-source {
    overflow: hidden;
    color: #789198;
    font-size: 10px;
    font-weight: 600;
    text-overflow: ellipsis;
  }

  .parameter-value {
    min-width: 0;
  }

  .specified-value {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: var(--mbc-form-control-gap);
    min-width: 0;
  }

  .read-only-value {
    display: flex;
    align-items: center;
    min-height: 32px;
    padding: 0 9px;
    border: 1px solid rgba(154, 203, 212, 0.58);
    border-radius: 6px;
    background: rgba(232, 242, 244, 0.75);
    color: #6d8990;
    font-size: 12px;
    box-sizing: border-box;
  }

  .resolution-errors {
    display: grid;
    gap: 4px;
    padding: 8px 10px;
    border: 1px solid #d7a0a8;
    border-radius: 6px;
    background: #fff2f4;
    color: #914b59;
    font-size: 12px;
    font-weight: 700;
  }

  select,
  .parameter-value input {
    width: 100%;
    height: 32px;
    padding: 0 9px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }

  select:focus,
  .parameter-value input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }
</style>
