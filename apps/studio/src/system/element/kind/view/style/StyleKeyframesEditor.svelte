<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import IconButton from '../../../../ui/button/IconButton.svelte'
  import ColorSwatch from '../../../../ui/color/ColorSwatch.svelte'
  import CompactFormulaField from '../../../../ui/formula/CompactFormulaField.svelte'
  import FormulaModeToggle from '../../../../ui/formula/FormulaModeToggle.svelte'
  import SuggestTextInput from '../../../../ui/input/SuggestTextInput.svelte'
  import type StyleElement from './style-element'
  import StyleKeyframesElement from './style-keyframes-element'
  import StylePropertyCatalog from './style-property-catalog'
  import StylePropertyName from './style-property-name'
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

  let frames = $state<StyleKeyframesElement.Frame[]>([])
  let selectedFrameId = $state<string | null>(null)
  let lastValue = $state('')

  const selectedFrame = $derived(
    frames.find((frame) => frame.frameId === selectedFrameId) ?? null,
  )
  const duplicatePropertyKeys = $derived(
    StylePropertyName.getDuplicateKeys(selectedFrame?.declarations ?? []),
  )

  const emit = () => {
    lastValue = JSON.stringify(frames)
    onValueChange(lastValue)
  }

  $effect(() => {
    if (value === lastValue) return
    frames = StyleKeyframesElement.parseFrames(value)
    if (!frames.some((frame) => frame.frameId === selectedFrameId)) {
      selectedFrameId = frames[0]?.frameId ?? null
    }
    lastValue = value
  })

  const updateFrame = (
    frameId: string,
    update: (frame: StyleKeyframesElement.Frame) => StyleKeyframesElement.Frame,
  ) => {
    frames = frames.map((frame) => frame.frameId === frameId ? update(frame) : frame)
    emit()
  }

  const defaultOffset = (): number => {
    if (frames.length === 0) return 0
    if (frames.length === 1) return 100
    const used = new Set(frames.flatMap((frame) => frame.selectors.map((item) => item.value)))
    return [50, 25, 75, 0, 100].find((offset) => !used.has(offset)) ?? 50
  }

  const addFrame = () => {
    const frame = StyleKeyframesElement.createFrame(defaultOffset())
    frames = [...frames, frame]
    selectedFrameId = frame.frameId
    emit()
  }

  const removeFrame = (frameId: string) => {
    const index = frames.findIndex((frame) => frame.frameId === frameId)
    frames = frames.filter((frame) => frame.frameId !== frameId)
    if (selectedFrameId === frameId) {
      selectedFrameId = frames[Math.min(index, frames.length - 1)]?.frameId ?? null
    }
    emit()
  }

  const moveFrame = (frameId: string, offset: -1 | 1) => {
    const index = frames.findIndex((frame) => frame.frameId === frameId)
    const target = index + offset
    if (index < 0 || target < 0 || target >= frames.length) return
    const next = [...frames]
    ;[next[index], next[target]] = [next[target], next[index]]
    frames = next
    emit()
  }

  const frameLabel = (frame: StyleKeyframesElement.Frame): string => (
    frame.selectors.map((selector) => `${selector.value}%`).join(', ')
  )

  const addSelector = (frame: StyleKeyframesElement.Frame) => {
    const used = new Set(frame.selectors.map((selector) => selector.value))
    const value = [50, 0, 100, 25, 75].find((offset) => !used.has(offset))
    if (value == null) return
    updateFrame(frame.frameId, (current) => ({
      ...current,
      selectors: [...current.selectors, { type: 'offset', value }],
    }))
  }

  const updateSelector = (
    frame: StyleKeyframesElement.Frame,
    index: number,
    value: number,
  ) => {
    updateFrame(frame.frameId, (current) => ({
      ...current,
      selectors: current.selectors.map((selector, currentIndex) => (
        currentIndex === index ? { ...selector, value } : selector
      )),
    }))
  }

  const removeSelector = (
    frame: StyleKeyframesElement.Frame,
    index: number,
  ) => {
    if (frame.selectors.length <= 1) return
    updateFrame(frame.frameId, (current) => ({
      ...current,
      selectors: current.selectors.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const addDeclaration = (frame: StyleKeyframesElement.Frame) => {
    updateFrame(frame.frameId, (current) => ({
      ...current,
      declarations: [...current.declarations, {
        type: 'declaration',
        property: '',
        value: { type: 'literal', value: '' },
      }],
    }))
  }

  const updateDeclaration = (
    frame: StyleKeyframesElement.Frame,
    index: number,
    patch: Partial<StyleElement.DeclarationRule>,
  ) => {
    updateFrame(frame.frameId, (current) => ({
      ...current,
      declarations: current.declarations.map((declaration, currentIndex) => (
        currentIndex === index ? { ...declaration, ...patch } : declaration
      )),
    }))
  }

  const removeDeclaration = (
    frame: StyleKeyframesElement.Frame,
    index: number,
  ) => {
    updateFrame(frame.frameId, (current) => ({
      ...current,
      declarations: current.declarations.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const moveDeclaration = (
    frame: StyleKeyframesElement.Frame,
    index: number,
    offset: -1 | 1,
  ) => {
    const target = index + offset
    if (target < 0 || target >= frame.declarations.length) return
    updateFrame(frame.frameId, (current) => {
      const declarations = [...current.declarations]
      ;[declarations[index], declarations[target]] = [declarations[target], declarations[index]]
      return { ...current, declarations }
    })
  }

  const updateMode = (
    frame: StyleKeyframesElement.Frame,
    index: number,
    mode: StyleElement.StyleValue['type'],
  ) => {
    updateDeclaration(frame, index, {
      value: mode === 'literal'
        ? { type: 'literal', value: '' }
        : { type: 'formula', source: '' },
    })
  }

  const getPropertyValidation = (
    property: string,
  ): { message: string; severity: 'warning' | 'error' } | null => {
    if (property.trim().length === 0) {
      return { message: 'Property is required.', severity: 'warning' }
    }
    if (
      StylePropertyCatalog.isAnimationProperty(property)
      && property.trim().toLowerCase() !== 'animation-timing-function'
    ) {
      return {
        message: 'Animation properties belong in the Style Animations tab.',
        severity: 'error',
      }
    }
    if (duplicatePropertyKeys.has(StylePropertyName.normalize(property))) {
      return { message: 'Property is duplicated in this frame.', severity: 'error' }
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
    declaration: StyleElement.DeclarationRule,
  ): { message: string; severity: 'warning' | 'error' } | null => {
    const source = declaration.value.type === 'literal'
      ? declaration.value.value
      : declaration.value.source
    if (source.trim().length === 0) {
      return {
        message: declaration.value.type === 'literal'
          ? 'Value is required.'
          : 'Formula is required.',
        severity: 'warning',
      }
    }
    if (
      declaration.value.type === 'literal'
      && StyleValueSupport.check(declaration.property, declaration.value.value) === 'unsupported'
    ) {
      return {
        message: `'${declaration.value.value}' is not supported for '${declaration.property}' in this runtime.`,
        severity: 'error',
      }
    }
    return null
  }
</script>

<div class="keyframes-editor">
  {#if errorMessage != null}<div class="editor-error">{errorMessage}</div>{/if}
  <div class="split-pane">
    <section class="frames-pane" aria-label="Keyframes">
      <div class="pane-header">
        <span>Keyframes</span>
        <button type="button" onclick={addFrame}>Add frame</button>
      </div>
      {#if frames.length === 0}
        <div class="empty">No frames.</div>
      {:else}
        <div class="frame-list">
          {#each frames as frame, index (frame.frameId)}
            <div class:active={frame.frameId === selectedFrameId} class="frame-row">
              <button
                type="button"
                class="frame-select"
                onclick={() => selectedFrameId = frame.frameId}
              >{frameLabel(frame)}</button>
              <div class="actions">
                <IconButton label="Move frame up" disabled={index === 0} onclick={() => moveFrame(frame.frameId, -1)}>
                  {#snippet icon()}<ArrowUp size={15} strokeWidth={2} />{/snippet}
                </IconButton>
                <IconButton label="Move frame down" disabled={index === frames.length - 1} onclick={() => moveFrame(frame.frameId, 1)}>
                  {#snippet icon()}<ArrowDown size={15} strokeWidth={2} />{/snippet}
                </IconButton>
                <IconButton label="Delete frame" onclick={() => removeFrame(frame.frameId)}>
                  {#snippet icon()}<Trash2 size={15} strokeWidth={2} />{/snippet}
                </IconButton>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="frame-pane" aria-label="Selected keyframe">
      {#if selectedFrame == null}
        <div class="empty">Add or select a frame.</div>
      {:else}
        <div class="selector-section">
          <div class="pane-header">
            <span>Selectors</span>
            <button type="button" onclick={() => addSelector(selectedFrame)}>Add offset</button>
          </div>
          <div class="selector-list">
            {#each selectedFrame.selectors as selector, index}
              <div class="selector-row">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={selector.value}
                  aria-label={`Frame offset ${index + 1}`}
                  onchange={(event) => updateSelector(
                    selectedFrame,
                    index,
                    Number(event.currentTarget.value),
                  )}
                />
                <span>%</span>
                <IconButton
                  label="Delete offset"
                  disabled={selectedFrame.selectors.length <= 1}
                  onclick={() => removeSelector(selectedFrame, index)}
                >
                  {#snippet icon()}<Trash2 size={15} strokeWidth={2} />{/snippet}
                </IconButton>
              </div>
            {/each}
          </div>
        </div>

        <div class="properties-section">
          <div class="pane-header">
            <span>Properties</span>
            <button type="button" onclick={() => addDeclaration(selectedFrame)}>Add property</button>
          </div>
          {#if selectedFrame.declarations.length === 0}
            <div class="empty">No properties in this frame.</div>
          {:else}
            <div class="property-table">
              <div class="property-head">Property</div>
              <div class="property-head">Value</div>
              <div class="property-head">Actions</div>
              {#each selectedFrame.declarations as declaration, index}
                {@const propertyValidation = getPropertyValidation(declaration.property)}
                {@const valueValidation = getValueValidation(declaration)}
                <SuggestTextInput
                  value={declaration.property}
                options={[...StylePropertyCatalog.options, { value: 'animation-timing-function' }]}
                  validationMessage={propertyValidation?.message}
                  validationSeverity={propertyValidation?.severity}
                  onValueChange={(property) => updateDeclaration(
                    selectedFrame,
                    index,
                    { property },
                  )}
                />
                <div class="value-editor">
                  <FormulaModeToggle
                    mode={declaration.value.type}
                    onModeChange={(mode) => updateMode(selectedFrame, index, mode)}
                  />
                  {#if declaration.value.type === 'literal'}
                    <div class:color={StylePropertyCatalog.isColorProperty(declaration.property)} class="literal-editor">
                      {#if StylePropertyCatalog.isColorProperty(declaration.property)}
                        <ColorSwatch
                          value={declaration.value.value}
                          onValueChange={(nextValue) => updateDeclaration(selectedFrame, index, {
                            value: { type: 'literal', value: nextValue },
                          })}
                        />
                      {/if}
                      <SuggestTextInput
                        value={declaration.value.value}
                        options={StylePropertyCatalog.getLiteralOptions(
                          declaration.property,
                          declaration.value.value,
                        )}
                        validationMessage={valueValidation?.message}
                        validationSeverity={valueValidation?.severity}
                        onValueChange={(nextValue) => updateDeclaration(selectedFrame, index, {
                          value: { type: 'literal', value: nextValue },
                        })}
                      />
                    </div>
                  {:else}
                    <CompactFormulaField
                      value={declaration.value.source}
                      ariaLabel={`${declaration.property || 'Keyframe property'} formula`}
                      validationMessage={valueValidation?.message}
                      validationSeverity={valueValidation?.severity}
                      injectionSource={formulaInjectionSource}
                      expectedType="string"
                      onValueChange={(source) => updateDeclaration(selectedFrame, index, {
                        value: { type: 'formula', source },
                      })}
                    />
                  {/if}
                </div>
                <div class="actions">
                  <IconButton label="Move property up" disabled={index === 0} onclick={() => moveDeclaration(selectedFrame, index, -1)}>
                    {#snippet icon()}<ArrowUp size={15} strokeWidth={2} />{/snippet}
                  </IconButton>
                  <IconButton label="Move property down" disabled={index === selectedFrame.declarations.length - 1} onclick={() => moveDeclaration(selectedFrame, index, 1)}>
                    {#snippet icon()}<ArrowDown size={15} strokeWidth={2} />{/snippet}
                  </IconButton>
                  <IconButton label="Delete property" onclick={() => removeDeclaration(selectedFrame, index)}>
                    {#snippet icon()}<Trash2 size={15} strokeWidth={2} />{/snippet}
                  </IconButton>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .keyframes-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    color: #2b4850;
    font-size: 13px;
  }

  .editor-error {
    padding-bottom: 7px;
    color: #b94755;
    font-weight: 700;
  }

  .split-pane {
    display: grid;
    grid-template-columns: minmax(240px, 32%) minmax(480px, 1fr);
    flex: 1 1 auto;
    min-height: 0;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: rgba(250, 253, 254, 0.72);
    overflow: hidden;
  }

  .frames-pane,
  .frame-pane {
    min-width: 0;
    min-height: 0;
    padding: 12px;
    overflow: auto;
  }

  .frames-pane {
    border-right: 1px solid var(--mbc-color-border-strong);
    background: #eef8fa;
  }

  .frame-pane {
    display: grid;
    grid-template-rows: min-content minmax(0, 1fr);
    gap: 16px;
    background: #fbfefe;
  }

  .pane-header,
  .frame-row,
  .actions,
  .selector-row {
    display: flex;
    align-items: center;
  }

  .pane-header {
    justify-content: space-between;
    min-height: 28px;
    margin-bottom: 10px;
    color: #36545b;
    font-weight: 800;
  }

  .pane-header button {
    height: 28px;
    padding: 0 12px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: white;
    color: #236f7a;
    font: inherit;
    font-weight: 700;
  }

  .frame-list,
  .selector-list {
    display: grid;
    align-content: start;
    gap: 8px;
  }

  .frame-row {
    gap: 7px;
    padding: 6px;
    border: 1px solid rgba(154, 203, 212, 0.82);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.82);
  }

  .frame-row.active {
    border-color: #55b7c5;
    background: #cceff4;
  }

  .frame-select {
    flex: 1;
    min-width: 0;
    height: 30px;
    padding: 0 8px;
    border: 0;
    background: transparent;
    color: #27484f;
    text-align: left;
    font: inherit;
    font-weight: 800;
  }

  .actions {
    gap: 5px;
  }

  .selector-list {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .selector-row {
    gap: 7px;
    padding: 7px;
    border: 1px solid rgba(154, 203, 212, 0.65);
    border-radius: 6px;
    background: #f4fbfc;
  }

  .selector-row input {
    min-width: 0;
    width: 90px;
    height: 32px;
    padding: 0 8px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: white;
    color: #243f47;
    font: inherit;
  }

  .properties-section {
    min-height: 0;
    overflow: auto;
  }

  .property-table {
    display: grid;
    grid-template-columns: minmax(145px, 0.75fr) minmax(260px, 1.35fr) 96px;
    align-items: start;
    column-gap: var(--mbc-form-column-gap);
    row-gap: var(--mbc-form-row-gap);
    padding-right: 6px;
  }

  .property-head {
    color: #6d8990;
    font-size: 12px;
    font-weight: 700;
  }

  .value-editor {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: center;
    gap: var(--mbc-form-control-gap);
    min-width: 0;
  }

  .literal-editor {
    min-width: 0;
  }

  .literal-editor.color {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: center;
    gap: var(--mbc-form-control-gap);
  }

  .empty {
    padding: 12px;
    border: 1px solid rgba(154, 203, 212, 0.55);
    border-radius: 6px;
    background: rgba(244, 251, 252, 0.7);
    color: #718c92;
  }
</style>
