<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import IconButton from '../../../../ui/button/IconButton.svelte'
  import CompactFormulaField from '../../../../ui/formula/CompactFormulaField.svelte'
  import FormulaModeToggle from '../../../../ui/formula/FormulaModeToggle.svelte'
  import SuggestTextInput from '../../../../ui/input/SuggestTextInput.svelte'
  import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
  import StyleElement from './style-element'
  import StyleValueSupport from './style-value-support'

  type Props = {
    value: string
    options: readonly ElementEditSchema.SelectOption[]
    errorMessage?: string | null
    formulaInjectionSource?: string
    onValueChange: (value: string) => void
  }

  let {
    value,
    options,
    errorMessage = null,
    formulaInjectionSource,
    onValueChange,
  }: Props = $props()

  type Scope = 'default' | StyleElement.State
  type ValueKey = Exclude<keyof StyleElement.AnimationItem, 'referenceId' | 'keyframesId'>
  const valueFields: readonly {
    key: ValueKey
    label: string
    property: string
    suggestions: readonly { value: string }[]
  }[] = [
    { key: 'duration', label: 'Duration', property: 'animation-duration', suggestions: [{ value: '1s' }, { value: '300ms' }] },
    { key: 'timingFunction', label: 'Timing', property: 'animation-timing-function', suggestions: [{ value: 'ease' }, { value: 'linear' }, { value: 'ease-in' }, { value: 'ease-out' }, { value: 'ease-in-out' }] },
    { key: 'delay', label: 'Delay', property: 'animation-delay', suggestions: [{ value: '0s' }, { value: '100ms' }] },
    { key: 'iterationCount', label: 'Iterations', property: 'animation-iteration-count', suggestions: [{ value: '1' }, { value: 'infinite' }] },
    { key: 'direction', label: 'Direction', property: 'animation-direction', suggestions: [{ value: 'normal' }, { value: 'reverse' }, { value: 'alternate' }, { value: 'alternate-reverse' }] },
    { key: 'fillMode', label: 'Fill mode', property: 'animation-fill-mode', suggestions: [{ value: 'none' }, { value: 'forwards' }, { value: 'backwards' }, { value: 'both' }] },
    { key: 'playState', label: 'Play state', property: 'animation-play-state', suggestions: [{ value: 'running' }, { value: 'paused' }] },
    { key: 'composition', label: 'Composition', property: 'animation-composition', suggestions: [{ value: 'replace' }, { value: 'add' }, { value: 'accumulate' }] },
    { key: 'timeline', label: 'Timeline', property: 'animation-timeline', suggestions: [{ value: 'auto' }, { value: 'none' }] },
    { key: 'rangeStart', label: 'Range start', property: 'animation-range-start', suggestions: [{ value: 'normal' }, { value: 'entry' }, { value: 'cover' }, { value: 'contain' }, { value: 'exit' }] },
    { key: 'rangeEnd', label: 'Range end', property: 'animation-range-end', suggestions: [{ value: 'normal' }, { value: 'entry' }, { value: 'cover' }, { value: 'contain' }, { value: 'exit' }] },
  ]

  let rules = $state<StyleElement.AnimationRule[]>([])
  let activeScope = $state<Scope>('default')
  let lastValue = $state('')

  const emit = () => {
    lastValue = JSON.stringify(rules)
    onValueChange(lastValue)
  }

  $effect(() => {
    if (value === lastValue) return
    rules = StyleElement.parseAnimations(value)
    if (activeScope !== 'default' && !rules.some((rule) => rule.state === activeScope)) {
      activeScope = 'default'
    }
    lastValue = value
  })

  const scopeState = (): StyleElement.State | undefined => (
    activeScope === 'default' ? undefined : activeScope
  )
  const activeRule = $derived(rules.find((rule) => rule.state === scopeState()) ?? null)

  const replaceActiveRule = (next: StyleElement.AnimationRule | null) => {
    const state = scopeState()
    rules = [
      ...rules.filter((rule) => rule.state !== state),
      ...(next == null ? [] : [next]),
    ]
    emit()
  }

  const addState = (state: StyleElement.State) => {
    if (rules.some((rule) => rule.state === state)) return
    rules = [...rules, { type: 'animation', state, mode: 'custom', items: [] }]
    activeScope = state
    emit()
  }

  const removeActiveState = () => {
    if (activeScope === 'default') return
    rules = rules.filter((rule) => rule.state !== activeScope)
    activeScope = 'default'
    emit()
  }

  const setMode = (mode: 'unspecified' | StyleElement.AnimationRule['mode']) => {
    if (mode === 'unspecified') {
      replaceActiveRule(null)
      return
    }
    replaceActiveRule({
      type: 'animation',
      state: scopeState(),
      mode,
      items: mode === 'custom' ? activeRule?.items ?? [] : [],
    })
  }

  const setItems = (items: StyleElement.AnimationItem[]) => {
    if (activeRule == null || activeRule.mode !== 'custom') return
    replaceActiveRule({ ...activeRule, items })
  }

  const addAnimation = () => setItems([...(activeRule?.items ?? []), StyleElement.createAnimation()])
  const removeAnimation = (referenceId: string) => setItems(
    (activeRule?.items ?? []).filter((item) => item.referenceId !== referenceId),
  )
  const moveAnimation = (index: number, offset: -1 | 1) => {
    const items = [...(activeRule?.items ?? [])]
    const target = index + offset
    if (target < 0 || target >= items.length) return
    ;[items[index], items[target]] = [items[target], items[index]]
    setItems(items)
  }
  const updateAnimation = (
    referenceId: string,
    update: (item: StyleElement.AnimationItem) => StyleElement.AnimationItem,
  ) => setItems((activeRule?.items ?? []).map((item) => (
    item.referenceId === referenceId ? update(item) : item
  )))
  const updateMode = (
    item: StyleElement.AnimationItem,
    key: ValueKey,
    mode: StyleElement.StyleValue['type'],
  ) => updateAnimation(item.referenceId, (current) => ({
    ...current,
    [key]: mode === 'literal'
      ? { type: 'literal', value: '' }
      : { type: 'formula', source: '' },
  }))
</script>

<section class="animations-editor" aria-label="Style animations">
  <div class="state-toolbar">
    <div class="state-segments" aria-label="Animation state">
      <button type="button" class:active={activeScope === 'default'} onclick={() => activeScope = 'default'}>Default</button>
      {#each rules.filter((rule) => rule.state != null) as rule (rule.state)}
        <button type="button" class:active={activeScope === rule.state} onclick={() => activeScope = rule.state!}>:{rule.state}</button>
      {/each}
    </div>
    <div class="state-actions">
      <select aria-label="Add animation state" value="" onchange={(event) => {
        const state = event.currentTarget.value as StyleElement.State
        if (StyleElement.states.includes(state)) addState(state)
        event.currentTarget.value = ''
      }}>
        <option value="">Add state</option>
        {#each StyleElement.states.filter((state) => rules.every((rule) => rule.state !== state)) as state}
          <option value={state}>:{state}</option>
        {/each}
      </select>
      <button type="button" disabled={activeScope === 'default'} onclick={removeActiveState}>Remove state</button>
    </div>
  </div>

  <div class="mode-toolbar">
    <label>
      <span>Setting</span>
      <select value={activeRule?.mode ?? 'unspecified'} onchange={(event) => setMode(event.currentTarget.value as 'unspecified' | StyleElement.AnimationRule['mode'])}>
        <option value="unspecified">Unspecified (inherit)</option>
        <option value="none">None</option>
        <option value="custom">Custom</option>
      </select>
    </label>
    {#if activeRule?.mode === 'custom'}<button type="button" onclick={addAnimation}>Add animation</button>{/if}
  </div>

  <span class="header-error" role="alert">{errorMessage ?? ''}</span>

  {#if activeRule == null}
    <div class="empty">No animation override. Inherited animations remain unchanged.</div>
  {:else if activeRule.mode === 'none'}
    <div class="empty">Animations are cleared in this state.</div>
  {:else if activeRule.items.length === 0}
    <div class="empty">No animations. Add one or choose Unspecified.</div>
  {:else}
    <div class="animation-list">
      {#each activeRule.items as item, index (item.referenceId)}
        <article class="animation-card">
          <header>
            <strong>Animation {index + 1}</strong>
            <div class="row-actions">
              <IconButton label="Move animation up" disabled={index === 0} onclick={() => moveAnimation(index, -1)}>{#snippet icon()}<ArrowUp size={15} />{/snippet}</IconButton>
              <IconButton label="Move animation down" disabled={index === activeRule.items.length - 1} onclick={() => moveAnimation(index, 1)}>{#snippet icon()}<ArrowDown size={15} />{/snippet}</IconButton>
              <IconButton label="Delete animation" onclick={() => removeAnimation(item.referenceId)}>{#snippet icon()}<Trash2 size={15} />{/snippet}</IconButton>
            </div>
          </header>
          <label class="keyframes-field">
            <span>Keyframes</span>
            <select value={item.keyframesId} aria-invalid={item.keyframesId.length === 0} onchange={(event) => updateAnimation(item.referenceId, (current) => ({ ...current, keyframesId: event.currentTarget.value }))}>
              <option value=""></option>
              {#each options as option}<option value={option.value}>{option.label ?? option.value}</option>{/each}
            </select>
          </label>
          <div class="value-grid">
            {#each valueFields as field (field.key)}
              {@const fieldValue = item[field.key]}
              <span class="value-label">{field.label}</span>
              <FormulaModeToggle mode={fieldValue.type} onModeChange={(mode) => updateMode(item, field.key, mode)} />
              {#if fieldValue.type === 'literal'}
                <SuggestTextInput value={fieldValue.value} options={field.suggestions} validationMessage={fieldValue.value.trim().length === 0 ? 'Value is required.' : StyleValueSupport.check(field.property, fieldValue.value) === 'unsupported' ? `'${fieldValue.value}' is not supported for '${field.property}' in this runtime.` : undefined} validationSeverity={StyleValueSupport.check(field.property, fieldValue.value) === 'unsupported' ? 'error' : undefined} onValueChange={(nextValue) => updateAnimation(item.referenceId, (current) => ({ ...current, [field.key]: { type: 'literal', value: nextValue } }))} />
              {:else}
                <CompactFormulaField value={fieldValue.source} ariaLabel={`${field.label} formula`} validationMessage={fieldValue.source.trim().length === 0 ? 'Formula is required.' : undefined} injectionSource={formulaInjectionSource} expectedType="string" onValueChange={(source) => updateAnimation(item.referenceId, (current) => ({ ...current, [field.key]: { type: 'formula', source } }))} />
              {/if}
            {/each}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .animations-editor { display: grid; grid-template-rows: min-content min-content min-content minmax(0, 1fr); gap: 10px; height: 100%; min-height: 0; overflow: hidden; font-size: 13px; }
  .state-toolbar, .state-segments, .state-actions, .mode-toolbar, .animation-card header, .row-actions, .keyframes-field { display: flex; align-items: center; }
  .state-toolbar, .mode-toolbar, .animation-card header { justify-content: space-between; gap: 10px; }
  .state-segments { min-width: 0; overflow-x: auto; }
  .state-actions, .row-actions { gap: 6px; }
  .state-actions { flex: 0 0 auto; }
  .state-actions select { width: 116px; height: 28px; font-size: 12px; }
  .state-toolbar button,
  .mode-toolbar > button {
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
  .state-toolbar button:disabled { opacity: .4; }
  .state-toolbar button:not(:disabled):hover,
  .mode-toolbar > button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }
  .state-segments button { border-radius: 0; border-right-width: 0; white-space: nowrap; }
  .state-segments button:first-child { border-radius: 6px 0 0 6px; }
  .state-segments button:last-child { border-right-width: 1px; border-radius: 0 6px 6px 0; }
  .state-segments button.active { border-color: #55b7c5; background: #cceff4; color: #174d59; }
  .mode-toolbar label { display: flex; align-items: center; gap: 8px; color: #496970; font-size: 13px; font-weight: 700; }
  select { height: 32px; border: 1px solid #9acbd4; border-radius: 6px; background: #fff; color: #243f47; padding: 0 9px; font: inherit; font-size: 13px; }
  .header-error { min-height: 18px; color: #b42318; font-size: 12px; }
  .empty { display: grid; place-items: center; min-height: 120px; color: #718b91; border: 1px dashed #bdd8dd; border-radius: 7px; }
  .animation-list { display: grid; gap: 12px; min-height: 0; overflow: auto; padding-right: 3px; }
  .animation-card { display: grid; gap: 12px; padding: 12px; border: 1px solid #b8dce2; border-radius: 8px; background: rgba(255, 255, 255, .72); }
  .animation-card strong { color: #2b5963; font-size: 13px; }
  .keyframes-field { justify-content: start; gap: 10px; color: #496970; font-size: 13px; font-weight: 700; }
  .keyframes-field select { width: min(100%, 280px); }
  .value-grid { display: grid; grid-template-columns: 92px min-content minmax(180px, 1fr); align-items: center; gap: 7px 8px; }
  .value-label { color: #496970; font-size: 12px; font-weight: 700; }
</style>
