<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import ActionField from '@system/ui/script/ActionField.svelte'
  import IconButton from '@system/ui/button/IconButton.svelte'
  import LiteralFormulaField from '@system/ui/input/LiteralFormulaField.svelte'
  import SuggestTextInput from '@system/ui/input/SuggestTextInput.svelte'
  import TagEventCatalog from '@system/model/view/tag-event-catalog'
  import TagAttributeCatalog from '@system/model/view/tag-attribute-catalog'
  import type TagElement from '@system/model/view/tag'
  import ScrollAfterUpdate from '@system/ui/scroll/scroll-after-update'

  type Props = {
    value: string
    tagName: string
    formulaInjectionSource?: string
    getActionInjectionSource?: (eventType: string) => string | undefined
    onValueChange: (value: string) => void
  }

  let {
    value,
    tagName,
    formulaInjectionSource,
    getActionInjectionSource,
    onValueChange,
  }: Props = $props()

  let attributes = $state<TagElement.Attribute[]>([])
  let lastValue = $state('')
  let attributeArea = $state<HTMLElement | null>(null)

  const getActionInjectionSourceForEvent = (
    eventName: string,
  ): string | undefined => getActionInjectionSource?.(
    TagEventCatalog.getEventType(eventName, tagName),
  )

  const parseAttributes = (
    source: string,
  ): TagElement.Attribute[] => {
    try {
      const parsed = JSON.parse(source)
      if (!Array.isArray(parsed)) return []

      return parsed
        .map(parseAttribute)
        .filter((attribute): attribute is TagElement.Attribute => attribute != null)
    } catch {
      return []
    }
  }

  const parseAttribute = (
    item: unknown,
  ): TagElement.Attribute | null => {
    if (item == null || typeof item !== 'object') return null
    const source = item as Partial<TagElement.Attribute>

    if (source.type === 'attribute') {
      const value = source.value
      if (typeof source.name !== 'string' || value == null) return null
      if (!isValue(value)) return null
      return {
        type: 'attribute',
        name: source.name,
        value,
      }
    }

    if (source.type === 'event') {
      const action = source.action
      if (
        typeof source.name !== 'string'
        || action == null
        || action.type !== 'script'
        || typeof action.source !== 'string'
      ) return null

      return {
        type: 'event',
        name: source.name,
        preventDefault: source.preventDefault === true,
        stopPropagation: source.stopPropagation === true,
        action: {
          type: 'script',
          source: action.source,
        },
      }
    }

    return null
  }

  const isValue = (
    item: unknown,
  ): item is TagElement.AttributeValue => {
    if (item == null || typeof item !== 'object') return false
    const value = item as Partial<TagElement.AttributeValue>

    switch (value.type) {
      case 'literal':
        return ['string', 'number', 'boolean'].includes(typeof value.value)
      case 'formula':
        return typeof value.source === 'string'
      default:
        return false
    }
  }

  const emit = () => {
    lastValue = JSON.stringify(attributes)
    onValueChange(lastValue)
  }

  $effect(() => {
    if (value === lastValue) return
    attributes = parseAttributes(value)
    lastValue = value
  })

  const addAttribute = () => {
    attributes = [
      ...attributes,
      {
        type: 'attribute',
        name: '',
        value: {
          type: 'formula',
          source: '',
        },
      },
    ]
    emit()
    void ScrollAfterUpdate.toEnd(() => attributeArea)
  }

  const addEvent = () => {
    attributes = [
      ...attributes,
      {
        type: 'event',
        name: '',
        preventDefault: false,
        stopPropagation: false,
        action: {
          type: 'script',
          source: '',
        },
      },
    ]
    emit()
    void ScrollAfterUpdate.toEnd(() => attributeArea)
  }

  const deleteAttribute = (index: number) => {
    attributes = attributes.filter((_, currentIndex) => currentIndex !== index)
    emit()
  }

  const moveAttribute = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= attributes.length) return

    const nextAttributes = [...attributes]
    const current = nextAttributes[index]
    nextAttributes[index] = nextAttributes[nextIndex]
    nextAttributes[nextIndex] = current
    attributes = nextAttributes
    emit()
  }

  const updateAttribute = (
    index: number,
    nextAttribute: TagElement.Attribute,
  ) => {
    attributes = attributes.map((attribute, currentIndex) => (
      currentIndex === index ? nextAttribute : attribute
    ))
    emit()
  }

  const updateAttributeName = (
    index: number,
    attribute: TagElement.HtmlAttribute,
    name: string,
  ) => {
    const previousDefinition = TagAttributeCatalog.getDefinition(tagName, attribute.name)
    const definition = TagAttributeCatalog.getDefinition(tagName, name)
    let nextValue = attribute.value

    if (definition == null) {
      if (nextValue.type === 'literal') nextValue = { type: 'formula', source: '' }
    } else if (
      nextValue.type === 'formula'
      && previousDefinition == null
      && nextValue.source.trim().length === 0
    ) {
      nextValue = { type: 'literal', value: createDefaultLiteral(definition.primitiveType) }
    } else if (
      nextValue.type === 'literal'
      && typeof nextValue.value !== definition.primitiveType
    ) {
      nextValue = { type: 'literal', value: createDefaultLiteral(definition.primitiveType) }
    }

    updateAttribute(index, { ...attribute, name, value: nextValue })
  }

  const createDefaultLiteral = (
    primitiveType: TagAttributeCatalog.PrimitiveType,
  ): string | number | boolean => {
    switch (primitiveType) {
      case 'string': return ''
      case 'number': return 0
      case 'boolean': return false
    }
  }

  const getDefinitionScopeLabel = (
    definition: TagAttributeCatalog.Definition,
  ): string => {
    switch (definition.scope) {
      case 'global': return 'global'
      case 'data': return 'data attribute'
      case 'tag': return tagName
    }
  }
</script>

<section class="tag-attributes" aria-label="Tag attributes">
  <div class="toolbar">
    <span></span>
    <div class="toolbar-actions">
      <button type="button" onclick={addAttribute}>Add Attribute</button>
      <button type="button" onclick={addEvent}>Add Event</button>
    </div>
  </div>

  {#if attributes.length === 0}
    <div class="empty">No attributes</div>
  {:else}
    <div class="attribute-area" bind:this={attributeArea}>
      {#each attributes as attribute, index}
        {@const attributePolicy = attribute.type === 'attribute'
          ? TagAttributeCatalog.resolvePolicy(tagName, attribute.name)
          : null}
        {@const attributeDefinition = attributePolicy?.status === 'supported'
          ? attributePolicy.definition
          : null}
        <section class="attribute-row" aria-label={`Attribute ${index + 1}`}>
          <div class="row-main">
            <span class="row-type" data-type={attribute.type}>{attribute.type}</span>

            {#if attribute.type === 'attribute'}
              <SuggestTextInput
                value={attribute.name}
                options={TagAttributeCatalog.getOptions(tagName)}
                onValueChange={(name) => updateAttributeName(index, attribute, name)}
              />
            {:else}
              <SuggestTextInput
                value={attribute.name}
                options={TagEventCatalog.options}
                onValueChange={(name) => {
                  updateAttribute(index, {
                    ...attribute,
                    name,
                  })
                }}
              />
            {/if}

            {#if attribute.type === 'event'}
              {@const eventType = TagEventCatalog.getEventType(attribute.name)}
              {@const isKnownEvent = TagEventCatalog.isKnown(attribute.name)}
              <span
                class="event-type-label"
                class:unknown={!isKnownEvent}
                title={isKnownEvent ? `$event is injected as ${eventType}.` : '$event is injected as Event.'}
              >
                {isKnownEvent ? eventType : 'Unknown event'}
              </span>
            {:else}
              <span
                class="attribute-type-label"
                class:unknown={attributePolicy?.status === 'unknown'}
                class:reserved={attributePolicy?.status === 'reserved'}
                title={attributePolicy?.status === 'reserved'
                  ? `${attributePolicy.reason}${attributePolicy.replacement == null ? '' : ` ${attributePolicy.replacement}`}`
                  : attributePolicy?.status === 'unknown'
                    ? 'Not found in the attribute catalog. Check the spelling.'
                    : undefined}
              >
                {attributePolicy?.status === 'reserved'
                  ? 'Reserved by Mebaco'
                  : attributePolicy?.status === 'unknown'
                    ? 'Unknown attribute'
                    : attributeDefinition == null
                      ? ''
                      : `${attributeDefinition.primitiveType} · ${getDefinitionScopeLabel(attributeDefinition)}`}
              </span>
            {/if}

            <div class="row-actions">
              <IconButton label="Move attribute up" disabled={index === 0} onclick={() => moveAttribute(index, -1)}>
                {#snippet icon()}<ArrowUp size={15} strokeWidth={2} />{/snippet}
              </IconButton>
              <IconButton label="Move attribute down" disabled={index === attributes.length - 1} onclick={() => moveAttribute(index, 1)}>
                {#snippet icon()}<ArrowDown size={15} strokeWidth={2} />{/snippet}
              </IconButton>
              <IconButton label="Delete attribute" onclick={() => deleteAttribute(index)}>
                {#snippet icon()}<Trash2 size={15} strokeWidth={2} />{/snippet}
              </IconButton>
            </div>
          </div>

          {#if attribute.type === 'attribute'}
            <div class="attribute-value-row">
              <span class="field-label">Value</span>
              {#if attributePolicy?.status === 'reserved'}
                <div class="reserved-message">
                  <span>{attributePolicy.reason}</span>
                  {#if attributePolicy.replacement != null}
                    <span>{attributePolicy.replacement}</span>
                  {/if}
                </div>
              {:else}
                <LiteralFormulaField
                  value={attribute.value}
                  primitiveType={attributeDefinition?.primitiveType}
                  editor={attributeDefinition?.editor}
                  formulaOnly={attributePolicy?.status === 'unknown'}
                  formulaAriaLabel={`${attribute.name || 'Unknown attribute'} formula`}
                  injectionSource={formulaInjectionSource}
                  onValueChange={(value) => updateAttribute(index, { ...attribute, value })}
                />
              {/if}
            </div>
          {:else}
            <div class="event-flags">
              <label class="flag">
                <input
                  type="checkbox"
                  checked={attribute.preventDefault}
                  onchange={(event) => {
                    updateAttribute(index, {
                      ...attribute,
                      preventDefault: event.currentTarget.checked,
                    })
                  }}
                />
                prevent default
              </label>
              <label class="flag">
                <input
                  type="checkbox"
                  checked={attribute.stopPropagation}
                  onchange={(event) => {
                    updateAttribute(index, {
                      ...attribute,
                      stopPropagation: event.currentTarget.checked,
                    })
                  }}
                />
                stop propagation
              </label>
            </div>
          {/if}

          {#if attribute.type === 'event'}
            <ActionField
              value={attribute.action.source}
              injectionSource={getActionInjectionSourceForEvent(attribute.name)}
              allowAwait={true}
              onValueChange={(source) => {
                updateAttribute(index, {
                  ...attribute,
                  action: {
                    type: 'script',
                    source,
                  },
                })
              }}
            />
          {/if}
        </section>
      {/each}
    </div>
  {/if}
</section>

<style>
  .tag-attributes {
    display: grid;
    grid-template-rows: min-content minmax(0, 1fr);
    gap: 10px;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .toolbar-actions {
    display: flex;
    gap: 6px;
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
    min-height: 0;
    padding: 12px;
    border: 1px solid rgba(154, 203, 212, 0.68);
    border-radius: 6px;
    background: rgba(244, 251, 252, 0.8);
    color: #6d8990;
    font-size: 13px;
    box-sizing: border-box;
  }

  .attribute-area {
    min-height: 0;
    padding: 0 4px 8px 0;
    overflow: auto;
    box-sizing: border-box;
  }

  .attribute-row {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(154, 203, 212, 0.68);
    border-radius: 7px;
    background: rgba(244, 251, 252, 0.72);
  }

  .attribute-row + .attribute-row {
    margin-top: 8px;
  }

  .row-main {
    display: grid;
    grid-template-columns: var(--mbc-tag-attribute-type-width, 74px) var(--mbc-tag-attribute-name-width, 230px) minmax(0, 1fr) max-content;
    gap: 8px;
    align-items: center;
  }

  .row-type {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    border: 1px solid #87bac2;
    border-radius: 5px;
    background: #d8f0ec;
    color: #27484f;
    font-size: 12px;
    font-weight: 800;
  }

  .row-type[data-type='event'] {
    background: #d9dcf0;
  }

  input {
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

  input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .row-actions {
    grid-column: 4;
    display: flex;
    justify-content: flex-end;
    gap: var(--mbc-form-action-gap);
  }

  .event-type-label {
    min-width: 0;
    overflow: hidden;
    color: #234f66;
    font-size: 12px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attribute-type-label {
    min-width: 0;
    overflow: hidden;
    color: #56777f;
    font-size: 12px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attribute-type-label.unknown {
    color: #9a6814;
    font-weight: 800;
  }

  .attribute-type-label.reserved {
    color: #b8454f;
    font-weight: 800;
  }

  .event-type-label.unknown {
    color: #b8454f;
  }

  .attribute-value-row {
    display: grid;
    grid-template-columns: var(--mbc-tag-attribute-type-width, 74px) minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }

  .field-label {
    color: #496970;
    font-size: 12px;
    font-weight: 700;
  }

  .reserved-message {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    gap: 3px 8px;
    padding: 7px 9px;
    border: 1px solid rgba(184, 69, 79, 0.48);
    border-radius: 6px;
    background: rgba(255, 241, 242, 0.88);
    color: #9f3640;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
  }

  .event-flags {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .flag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #496970;
    font-size: 12px;
    font-weight: 700;
  }

  .flag input {
    width: 14px;
    height: 14px;
    padding: 0;
  }
</style>
