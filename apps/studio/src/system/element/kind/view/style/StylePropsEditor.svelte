<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import IconButton from '../../../../ui/button/IconButton.svelte'
  import ColorSwatch from '../../../../ui/color/ColorSwatch.svelte'
  import CompactFormulaField from '../../../../ui/formula/CompactFormulaField.svelte'
  import FormulaModeToggle from '../../../../ui/formula/FormulaModeToggle.svelte'
  import SuggestTextInput from '../../../../ui/input/SuggestTextInput.svelte'
  import StylePropertyCatalog from './style-property-catalog'
  import StylePropertyName from './style-property-name'
  import StyleElement from './style-element'
  import StyleValueSupport from './style-value-support'

  type Props = {
    value: string
    errorMessage?: string | null
    formulaInjectionSource?: string
    onValueChange: (value: string) => void
  }

  let {
    value,
    errorMessage = null,
    formulaInjectionSource,
    onValueChange,
  }: Props = $props()

  type DeclarationRule = StyleElement.DeclarationRule
  type Scope = 'default' | StyleElement.State

  let defaultDeclarations = $state<DeclarationRule[]>([])
  let stateRules = $state<StyleElement.StateRule[]>([])
  let activeScope = $state<Scope>('default')
  let lastValue = $state('')

  const parseRules = (source: string): StyleElement.Rule[] => {
    try {
      const parsed = JSON.parse(source)
      if (!Array.isArray(parsed)) return []

      return parsed
        .map(parseRule)
        .filter((item): item is StyleElement.Rule => item != null)
    } catch {
      return []
    }
  }

  const parseRule = (item: unknown): StyleElement.Rule | null => {
    if (item == null || typeof item !== 'object') return null

    const rule = item as Partial<StyleElement.DeclarationRule> & Partial<StyleElement.StateRule>
    const value = StyleElement.parseStyleValue(rule.value)
    if (
      rule.type === 'declaration'
      && typeof rule.property === 'string'
      && value != null
    ) {
      return {
        type: 'declaration',
        property: rule.property,
        value,
      }
    }

    if (
      rule.type === 'state'
      && typeof rule.state === 'string'
      && StyleElement.states.includes(rule.state as StyleElement.State)
      && Array.isArray(rule.declarations)
    ) {
      return {
        type: 'state',
        state: rule.state as StyleElement.State,
        declarations: rule.declarations
          .map(parseRule)
          .filter((child): child is DeclarationRule => child?.type === 'declaration'),
      }
    }

    return null
  }

  const emit = () => {
    lastValue = JSON.stringify([...defaultDeclarations, ...stateRules])
    onValueChange(lastValue)
  }

  $effect(() => {
    if (value === lastValue) return
    const rules = parseRules(value)
    defaultDeclarations = rules.filter((rule): rule is DeclarationRule => (
      rule.type === 'declaration'
    ))
    stateRules = rules.filter((rule): rule is StyleElement.StateRule => (
      rule.type === 'state'
    ))
    if (
      activeScope !== 'default'
      && stateRules.every((rule) => rule.state !== activeScope)
    ) activeScope = 'default'
    lastValue = value
  })

  const getDeclarations = (): DeclarationRule[] => activeScope === 'default'
    ? defaultDeclarations
    : stateRules.find((rule) => rule.state === activeScope)?.declarations ?? []

  const setDeclarations = (declarations: DeclarationRule[]) => {
    if (activeScope === 'default') {
      defaultDeclarations = declarations
    } else {
      stateRules = stateRules.map((rule) => (
        rule.state === activeScope ? { ...rule, declarations } : rule
      ))
    }
  }

  const declarationRules = $derived.by(getDeclarations)
  const duplicatePropertyKeys = $derived(
    StylePropertyName.getDuplicateKeys(declarationRules),
  )

  const addState = (state: StyleElement.State) => {
    if (stateRules.some((rule) => rule.state === state)) return
    stateRules = [...stateRules, { type: 'state', state, declarations: [] }]
    activeScope = state
    emit()
  }

  const removeActiveState = () => {
    if (activeScope === 'default') return
    stateRules = stateRules.filter((rule) => rule.state !== activeScope)
    activeScope = 'default'
    emit()
  }

  const addProp = () => {
    setDeclarations([...getDeclarations(), {
      type: 'declaration',
      property: '',
      value: { type: 'literal', value: '' },
    }])
    emit()
  }

  const updateProp = (
    index: number,
    patch: Partial<DeclarationRule>,
  ) => {
    setDeclarations(getDeclarations().map((prop, currentIndex) => (
      currentIndex === index ? { ...prop, ...patch } : prop
    )))
    emit()
  }

  const updateMode = (
    index: number,
    mode: StyleElement.StyleValue['type'],
  ) => {
    updateProp(index, {
      value: mode === 'literal'
        ? { type: 'literal', value: '' }
        : { type: 'formula', source: '' },
    })
  }

  const deleteProp = (index: number) => {
    setDeclarations(getDeclarations().filter((_, currentIndex) => currentIndex !== index))
    emit()
  }

  const moveProp = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset
    const declarations = getDeclarations()
    if (nextIndex < 0 || nextIndex >= declarations.length) return

    const nextProps = [...declarations]
    const current = nextProps[index]
    nextProps[index] = nextProps[nextIndex]
    nextProps[nextIndex] = current
    setDeclarations(nextProps)
    emit()
  }

  const getPropertyValidation = (
    property: string,
  ): { message: string; severity: 'warning' | 'error' } | null => {
    if (property.trim().length === 0) {
      return { message: 'Property is required.', severity: 'warning' }
    }
    if (duplicatePropertyKeys.has(StylePropertyName.normalize(property))) {
      return {
        message: 'Property is duplicated in this state.',
        severity: 'error',
      }
    }
    if (!property.startsWith('--') && !StylePropertyCatalog.contains(property)) {
      return {
        message: 'Property is not in the standard catalog. It will still be saved.',
        severity: 'warning',
      }
    }
    return null
  }

  const getValueValidation = (
    prop: DeclarationRule,
  ): { message: string; severity: 'warning' | 'error' } | null => {
    const source = prop.value.type === 'literal' ? prop.value.value : prop.value.source
    if (source.length === 0) {
      return {
        message: prop.value.type === 'literal' ? 'Value is required.' : 'Formula is required.',
        severity: 'warning',
      }
    }
    if (
      prop.value.type === 'literal'
      && StyleValueSupport.check(prop.property, prop.value.value) === 'unsupported'
    ) {
      return {
        message: `'${prop.value.value}' is not supported for '${prop.property}' in this runtime.`,
        severity: 'error',
      }
    }
    return null
  }
</script>

<section class="style-props" aria-label="Style properties">
  <div class="state-toolbar">
    <div class="state-segments" aria-label="Style state">
      <button
        type="button"
        class:active={activeScope === 'default'}
        onclick={() => activeScope = 'default'}
      >Default</button>
      {#each stateRules as rule (rule.state)}
        <button
          type="button"
          class:active={activeScope === rule.state}
          onclick={() => activeScope = rule.state}
        >:{rule.state}</button>
      {/each}
    </div>
    <div class="state-actions">
      <select
        aria-label="Add style state"
        value=""
        disabled={stateRules.length === StyleElement.states.length}
        onchange={(event) => {
          const state = event.currentTarget.value as StyleElement.State
          if (StyleElement.states.includes(state)) addState(state)
          event.currentTarget.value = ''
        }}
      >
        <option value="">Add state</option>
        {#each StyleElement.states.filter((state) => stateRules.every((rule) => rule.state !== state)) as state}
          <option value={state}>:{state}</option>
        {/each}
      </select>
      <button type="button" disabled={activeScope === 'default'} onclick={removeActiveState}>Remove state</button>
    </div>
  </div>

  <div class="style-props-header">
    <span class="header-error" role="alert">{errorMessage ?? ''}</span>
    <button type="button" onclick={addProp}>Add</button>
  </div>

  {#if declarationRules.length === 0}
    <div class="empty">No properties</div>
  {:else}
    <div class="prop-area">
      <div class="prop-table">
        <div class="prop-head">Property</div>
        <div class="prop-head">Value</div>
        <div class="prop-head actions-head">Actions</div>

        {#each declarationRules as prop, index}
          {@const propertyValidation = getPropertyValidation(prop.property)}
          {@const valueValidation = getValueValidation(prop)}
          <SuggestTextInput
            value={prop.property}
            options={StylePropertyCatalog.options}
            validationMessage={propertyValidation?.message}
            validationSeverity={propertyValidation?.severity}
            onValueChange={(nextValue) => {
              updateProp(index, { property: nextValue })
            }}
          />
          <div class="value-editor">
            <FormulaModeToggle
              mode={prop.value.type}
              onModeChange={(mode) => updateMode(index, mode)}
            />
            {#if prop.value.type === 'literal'}
              <div class="literal-editor" class:color={StylePropertyCatalog.isColorProperty(prop.property)}>
                {#if StylePropertyCatalog.isColorProperty(prop.property)}
                  <ColorSwatch
                    value={prop.value.value}
                    onValueChange={(nextValue) => {
                      updateProp(index, {
                        value: { type: 'literal', value: nextValue },
                      })
                    }}
                  />
                {/if}
                <SuggestTextInput
                  value={prop.value.value}
                  options={StylePropertyCatalog.getLiteralOptions(prop.property, prop.value.value)}
                  validationMessage={valueValidation?.message}
                  validationSeverity={valueValidation?.severity}
                  onValueChange={(nextValue) => {
                    updateProp(index, {
                      value: { type: 'literal', value: nextValue },
                    })
                  }}
                />
              </div>
            {:else}
              <CompactFormulaField
                value={prop.value.source}
                ariaLabel={`${prop.property || 'Style property'} formula`}
                validationMessage={valueValidation?.message}
                validationSeverity={valueValidation?.severity}
                injectionSource={formulaInjectionSource}
                expectedType="string"
                onValueChange={(source) => {
                  updateProp(index, {
                    value: { type: 'formula', source },
                  })
                }}
              />
            {/if}
          </div>
          <div class="row-actions">
            <IconButton label="Move property up" disabled={index === 0} onclick={() => moveProp(index, -1)}>
              {#snippet icon()}<ArrowUp size={15} strokeWidth={2} />{/snippet}
            </IconButton>
            <IconButton label="Move property down" disabled={index === declarationRules.length - 1} onclick={() => moveProp(index, 1)}>
              {#snippet icon()}<ArrowDown size={15} strokeWidth={2} />{/snippet}
            </IconButton>
            <IconButton label="Delete property" onclick={() => deleteProp(index)}>
              {#snippet icon()}<Trash2 size={15} strokeWidth={2} />{/snippet}
            </IconButton>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .style-props {
    display: grid;
    grid-template-rows: min-content min-content minmax(0, 1fr);
    gap: 10px;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .state-toolbar,
  .state-segments,
  .state-actions {
    display: flex;
    align-items: center;
  }

  .state-toolbar {
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
  }

  .state-segments {
    min-width: 0;
    overflow-x: auto;
  }

  .state-segments button {
    border-radius: 0;
    border-right-width: 0;
    white-space: nowrap;
  }

  .state-segments button:first-child {
    border-radius: 6px 0 0 6px;
  }

  .state-segments button:last-child {
    border-right-width: 1px;
    border-radius: 0 6px 6px 0;
  }

  .state-segments button.active {
    border-color: #55b7c5;
    background: #cceff4;
    color: #174d59;
  }

  .state-actions {
    flex: 0 0 auto;
    gap: 6px;
  }

  .state-actions select {
    width: 116px;
    height: 28px;
    font-size: 12px;
  }

  .style-props-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #496970;
    font-size: 13px;
    font-weight: 700;
  }

  .header-error {
    min-width: 0;
    overflow: hidden;
    color: #9c4556;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .style-props-header button,
  .state-toolbar button {
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

  .prop-area {
    height: 100%;
    min-height: 0;
    padding: 0 6px 8px 0;
    overflow: auto;
    scrollbar-gutter: stable;
    box-sizing: border-box;
  }

  .prop-table {
    display: grid;
    grid-template-columns: minmax(150px, 0.8fr) minmax(260px, 1.4fr) 96px;
    column-gap: var(--mbc-form-column-gap);
    row-gap: var(--mbc-form-row-gap);
    align-items: start;
  }

  .prop-head {
    color: #6d8990;
    font-size: 12px;
    font-weight: 700;
  }

  .actions-head {
    padding-left: 2px;
  }

  select {
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

  select:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .row-actions {
    display: flex;
    gap: var(--mbc-form-action-gap);
  }

  .value-editor {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: var(--mbc-form-control-gap);
    min-width: 0;
    align-items: center;
  }

  .literal-editor {
    min-width: 0;
  }

  .literal-editor.color {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: var(--mbc-form-control-gap);
    align-items: center;
  }
</style>
