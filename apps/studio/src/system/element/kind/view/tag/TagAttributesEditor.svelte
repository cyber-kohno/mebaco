<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import ActionField from '../../../../ui/script/ActionField.svelte'
  import IconButton from '../../../../ui/button/IconButton.svelte'
  import FormulaField from '../../../../ui/formula/FormulaField.svelte'
  import SuggestTextInput from '../../../../ui/input/SuggestTextInput.svelte'
  import TagEventCatalog from './tag-event-catalog'
  import type TagElement from './tag-element'

  type Props = {
    value: string
    formulaInjectionSource?: string
    getActionInjectionSource?: (eventType: string) => string | undefined
    onValueChange: (value: string) => void
  }

  let {
    value,
    formulaInjectionSource,
    getActionInjectionSource,
    onValueChange,
  }: Props = $props()

  let attributes = $state<TagElement.Attribute[]>([])
  let lastValue = $state('')

  const valueTypes = ['empty', 'literal', 'formula', 'boolean'] as const

  const getActionInjectionSourceForEvent = (
    eventName: string,
  ): string | undefined => getActionInjectionSource?.(TagEventCatalog.getEventType(eventName))

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

    if (source.type === 'attribute' || source.type === 'property') {
      const value = source.value
      if (typeof source.name !== 'string' || value == null) return null
      if (!isValue(value)) return null
      return {
        type: source.type,
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
      case 'empty':
        return true
      case 'literal':
        return typeof value.value === 'string'
      case 'formula':
        return typeof value.source === 'string'
      case 'boolean':
        return typeof value.value === 'boolean'
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
          type: 'literal',
          value: '',
        },
      },
    ]
    emit()
  }

  const addEvent = () => {
    attributes = [
      ...attributes,
      {
        type: 'event',
        name: 'click',
        preventDefault: false,
        stopPropagation: false,
        action: {
          type: 'script',
          source: '',
        },
      },
    ]
    emit()
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

  const createValueByType = (
    valueType: TagElement.AttributeValue['type'],
  ): TagElement.AttributeValue => {
    switch (valueType) {
      case 'empty':
        return {
          type: 'empty',
        }
      case 'formula':
        return {
          type: 'formula',
          source: '',
        }
      case 'boolean':
        return {
          type: 'boolean',
          value: false,
        }
      case 'literal':
        return {
          type: 'literal',
          value: '',
        }
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
    <div class="attribute-area">
      {#each attributes as attribute, index}
        <section class="attribute-row" aria-label={`Attribute ${index + 1}`}>
          <div class="row-main">
            <span class="row-type" data-type={attribute.type}>{attribute.type}</span>

            {#if attribute.type === 'attribute' || attribute.type === 'property'}
              <input
                class="name-input"
                type="text"
                value={attribute.name}
                oninput={(event) => {
                  updateAttribute(index, {
                    ...attribute,
                    name: event.currentTarget.value,
                  })
                }}
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

          {#if attribute.type === 'attribute' || attribute.type === 'property'}
            <div class="value-type-row">
              <span class="field-label">Set Value</span>
              <select
                class="value-kind"
                value={attribute.value.type}
                onchange={(event) => {
                  updateAttribute(index, {
                    ...attribute,
                    value: createValueByType(event.currentTarget.value as TagElement.AttributeValue['type']),
                  })
                }}
              >
                {#each valueTypes as valueType}
                  <option value={valueType}>{valueType}</option>
                {/each}
              </select>
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

          {#if attribute.type === 'attribute' || attribute.type === 'property'}
            {#if attribute.value.type === 'literal'}
              <input
                class="wide-input"
                type="text"
                value={attribute.value.value}
                oninput={(event) => {
                  updateAttribute(index, {
                    ...attribute,
                    value: {
                      type: 'literal',
                      value: event.currentTarget.value,
                    },
                  })
                }}
              />
            {:else if attribute.value.type === 'formula'}
              <FormulaField
                value={attribute.value.source}
                injectionSource={formulaInjectionSource}
                onValueChange={(source) => {
                  updateAttribute(index, {
                    ...attribute,
                    value: {
                      type: 'formula',
                      source,
                    },
                  })
                }}
              />
            {:else if attribute.value.type === 'boolean'}
              <label class="flag">
                <input
                  type="checkbox"
                  checked={attribute.value.value}
                  onchange={(event) => {
                    updateAttribute(index, {
                      ...attribute,
                      value: {
                        type: 'boolean',
                        value: event.currentTarget.checked,
                      },
                    })
                  }}
                />
                true
              </label>
            {/if}
          {:else}
            <ActionField
              value={attribute.action.source}
              injectionSource={getActionInjectionSourceForEvent(attribute.name)}
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
    gap: 10px;
    min-height: 0;
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
    height: 260px;
    padding: 12px;
    border: 1px solid rgba(154, 203, 212, 0.68);
    border-radius: 6px;
    background: rgba(244, 251, 252, 0.8);
    color: #6d8990;
    font-size: 13px;
    box-sizing: border-box;
  }

  .attribute-area {
    height: 320px;
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
    grid-template-columns: var(--mbc-tag-attribute-type-width, 74px) var(--mbc-tag-attribute-name-width, 180px) minmax(0, 1fr) max-content;
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

  input,
  select {
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

  input:focus,
  select:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .name-input,
  .value-kind,
  .wide-input {
    width: 100%;
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

  .event-type-label.unknown {
    color: #b8454f;
  }

  .value-type-row {
    display: grid;
    grid-template-columns: var(--mbc-tag-attribute-type-width, 74px) var(--mbc-tag-attribute-name-width, 180px);
    gap: 8px;
    align-items: center;
  }

  .field-label {
    color: #496970;
    font-size: 12px;
    font-weight: 700;
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
