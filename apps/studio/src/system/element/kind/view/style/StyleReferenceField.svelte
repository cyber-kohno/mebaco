<script lang="ts">
  import { onMount, tick } from 'svelte'
  import Check from '@lucide/svelte/icons/check'
  import CircleAlert from '@lucide/svelte/icons/circle-alert'
  import CircleDashed from '@lucide/svelte/icons/circle-dashed'
  import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
  import bodyPortal from '../../../../ui/body-portal'
  import StyleReferenceOptions from './style-reference-options'
  import type StyleReferencePreview from '../../../../runtime/style/style-reference-preview'

  type Props = {
    value: string
    options: readonly ElementEditSchema.SelectOption[]
    getPreview?: StyleReferencePreview.Resolver
    onValueChange: (value: string) => void
  }

  let { value, options, getPreview, onValueChange }: Props = $props()

  let isOpen = $state(false)
  let categoryQuery = $state('')
  let idQuery = $state('')
  let focusedIndex = $state(0)
  let triggerElement: HTMLButtonElement | null = null
  let popupElement = $state<HTMLDivElement | null>(null)
  let categoryInput = $state<HTMLInputElement | null>(null)
  let popupLeft = $state(0)
  let popupTop = $state(0)
  let popupWidth = $state(480)
  let popupHeight = $state(337)
  let previewOnLeft = $state(false)

  const preferredPopupHeight = 337
  const previewWidth = 330

  const selectedOption = $derived(options.find((option) => option.value === value))
  const filteredOptions = $derived(StyleReferenceOptions.getMatches(
    options,
    categoryQuery,
    idQuery,
  ))
  const focusedOption = $derived(filteredOptions[focusedIndex])
  const preview = $derived(
    focusedOption == null || getPreview == null
      ? null
      : getPreview(focusedOption.value),
  )

  const updatePopupPosition = () => {
    if (!isOpen || triggerElement == null) return
    const margin = 8
    const rect = triggerElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    popupWidth = Math.min(480, viewportWidth - margin * 2)
    popupLeft = Math.min(
      Math.max(rect.left, margin),
      viewportWidth - margin - popupWidth,
    )
    previewOnLeft = popupLeft + popupWidth + previewWidth > viewportWidth - margin
      && popupLeft >= previewWidth + margin
    popupHeight = Math.min(preferredPopupHeight, viewportHeight - margin * 2)
    const spaceBelow = viewportHeight - rect.bottom - margin
    const spaceAbove = rect.top - margin
    const openAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow
    popupTop = openAbove
      ? Math.max(margin, rect.top - popupHeight)
      : Math.min(viewportHeight - margin - popupHeight, rect.bottom)
  }

  const open = () => {
    categoryQuery = ''
    idQuery = ''
    focusedIndex = Math.max(0, options.findIndex((option) => option.value === value))
    isOpen = true
    void tick().then(() => {
      updatePopupPosition()
      categoryInput?.focus()
    })
  }

  const close = () => {
    isOpen = false
    triggerElement?.focus()
  }

  const commit = (option: ElementEditSchema.SelectOption) => {
    onValueChange(option.value)
    close()
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (filteredOptions.length === 0) return
    if (event.key === 'ArrowDown') {
      focusedIndex = Math.min(focusedIndex + 1, filteredOptions.length - 1)
      event.preventDefault()
    } else if (event.key === 'ArrowUp') {
      focusedIndex = Math.max(0, focusedIndex - 1)
      event.preventDefault()
    } else if (event.key === 'Enter') {
      commit(filteredOptions[focusedIndex])
      event.preventDefault()
    }
  }

  $effect(() => {
    categoryQuery
    idQuery
    focusedIndex = 0
    void tick().then(updatePopupPosition)
  })

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpen || !(event.target instanceof Node)) return
      if (popupElement?.contains(event.target) || triggerElement?.contains(event.target)) return
      isOpen = false
    }
    const handleResize = () => updatePopupPosition()
    const handleScroll = (event: Event) => {
      if (popupElement != null && event.target instanceof Node && popupElement.contains(event.target)) {
        return
      }
      isOpen = false
    }
    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  })
</script>

<button
  bind:this={triggerElement}
  class="style-reference"
  class:empty={value.length === 0}
  class:missing={value.length > 0 && selectedOption == null}
  type="button"
  aria-haspopup="dialog"
  aria-expanded={isOpen}
  onclick={() => isOpen ? close() : open()}
>
  {#if selectedOption != null}
    <span class="style-status specified" aria-label="Style selected" title="Style selected">
      <Check size={15} strokeWidth={3} />
    </span>
    {#if selectedOption.category != null && selectedOption.category.length > 0}
      <span class="selected-category">{selectedOption.category}</span>
      <span class="separator">/</span>
    {/if}
    <span>{selectedOption.label ?? selectedOption.value}</span>
  {:else if value.length > 0}
    <span class="style-status missing" aria-label="Style reference is missing" title="Style reference is missing">
      <CircleAlert size={15} strokeWidth={2.4} />
    </span>
    <span>Missing style ({value})</span>
  {:else}
    <span class="style-status unspecified" aria-label="Style not selected" title="Style not selected">
      <CircleDashed size={15} strokeWidth={2.4} />
    </span>
    <span>Select style</span>
  {/if}
</button>

{#if isOpen}
  <div
    bind:this={popupElement}
    class="style-picker"
    use:bodyPortal
    role="dialog"
    tabindex="-1"
    aria-label="Select style"
    style:left={`${popupLeft}px`}
    style:top={`${popupTop}px`}
    style:width={`${popupWidth}px`}
    style:height={`${popupHeight}px`}
    onkeydown={handleKeydown}
  >
    <div class="picker-toolbar">
      <span>Select style</span>
      <button
        type="button"
        disabled={value.length === 0}
        onclick={() => {
          onValueChange('')
          close()
        }}
      >Clear</button>
    </div>
    <div class="filter-grid">
      <label>
        <span>Category</span>
        <input bind:this={categoryInput} type="text" bind:value={categoryQuery} autocomplete="off" />
      </label>
      <label>
        <span>Id</span>
        <input type="text" bind:value={idQuery} autocomplete="off" />
      </label>
    </div>
    <div class="column-head" aria-hidden="true">
      <span>Category</span>
      <span>Id</span>
    </div>
    <div class="option-list" role="listbox" aria-label="Styles">
      {#each filteredOptions as option, index (option.value)}
        <button
          class:focused={index === focusedIndex}
          class:selected={option.value === value}
          type="button"
          role="option"
          aria-selected={option.value === value}
          onclick={() => commit(option)}
          onmouseenter={() => focusedIndex = index}
        >
          <span class:uncategorized={option.category == null || option.category.length === 0}>
            {option.category ?? '—'}
          </span>
          <span>{option.label ?? option.value}</span>
        </button>
      {:else}
        <div class="no-results">No matching styles</div>
      {/each}
    </div>

    {#if focusedOption != null && preview != null}
      <aside
        class="style-preview"
        class:preview-left={previewOnLeft}
        aria-label={`${focusedOption.label ?? focusedOption.value} style preview`}
      >
        <header>
          <strong>{focusedOption.label ?? focusedOption.value}</strong>
          <span>Property preview</span>
        </header>
        <div class="preview-body">
          {#if preview.issues.length > 0}
            <div class="preview-issues">
              {#each preview.issues as issue}<div>{issue}</div>{/each}
            </div>
          {/if}
          {#each preview.sections as section}
            {#if section.entries.length > 0}
              <section class="preview-section">
                <h3>{section.state == null ? 'Default' : `:${section.state}`}</h3>
                <div class="preview-table">
                  {#each section.entries as entry}
                    <span class="preview-property">{entry.property}</span>
                    <span class="preview-value" title={entry.value}>
                      {#if entry.formula}<small>fx</small>{/if}
                      <span>{entry.value}</span>
                    </span>
                  {/each}
                </div>
              </section>
            {/if}
          {/each}
          {#if preview.sections.every((section) => section.entries.length === 0)}
            <div class="preview-empty">No style properties</div>
          {/if}
        </div>
      </aside>
    {/if}
  </div>
{/if}

<style>
  .style-reference {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 30px;
    padding: 0 10px 0 7px;
    overflow: hidden;
    border: 0;
    border-left: 3px solid #ad6f9d;
    border-radius: 0;
    background: #f7eef6;
    color: #623f60;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    text-align: left;
    white-space: nowrap;
    cursor: default;
  }

  .style-reference:hover,
  .style-reference:focus {
    background: #efdfed;
  }

  .style-reference:focus-visible {
    box-shadow: 0 0 0 3px rgba(173, 111, 157, 0.22);
    outline: none;
  }

  .style-reference.empty {
    border-left-color: #aeb9bd;
    background: #f1f3f4;
    color: #7d8b90;
    font-weight: 600;
  }

  .style-reference.empty:hover,
  .style-reference.empty:focus {
    background: #e7ebed;
  }

  .style-reference.empty > span:last-child {
    font-style: italic;
  }

  .style-reference.missing {
    border-left-color: #d04452;
    background: #fff0f1;
    color: #914b59;
  }

  .style-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 17px;
    height: 17px;
  }

  .style-status.specified { color: #70a525; }

  .style-status.unspecified { color: #b27a25; }

  .style-status.missing { color: #d04452; }

  .style-reference > span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .selected-category {
    color: #617c83;
  }

  .separator {
    color: #9ab0b5;
  }

  .style-picker {
    position: fixed;
    z-index: 1200;
    display: grid;
    grid-template-rows: min-content min-content min-content minmax(0, 1fr);
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(147, 214, 225, 0.8);
    border-radius: 8px;
    background: #173f48;
    box-shadow: 0 14px 34px rgba(14, 44, 50, 0.3);
    color: #f4fbfc;
    box-sizing: border-box;
  }

  .picker-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #d8edf0;
    font-size: 12px;
    font-weight: 700;
  }

  .picker-toolbar button {
    height: 26px;
    padding: 0 8px;
    border: 1px solid #6da6af;
    border-radius: 5px;
    background: transparent;
    color: #d8edf0;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: default;
  }

  .picker-toolbar button:disabled {
    opacity: 0.4;
  }

  .picker-toolbar button:not(:disabled):hover {
    border-color: #89d9e4;
    background: rgba(54, 139, 151, 0.5);
  }

  .filter-grid,
  .column-head,
  .option-list button {
    display: grid;
    grid-template-columns: minmax(120px, 0.8fr) minmax(160px, 1.2fr);
    gap: 8px;
  }

  .filter-grid label {
    display: grid;
    gap: 4px;
    color: #c8e3e8;
    font-size: 11px;
    font-weight: 700;
  }

  .filter-grid input {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    border: 1px solid #6da6af;
    border-radius: 5px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }

  .filter-grid input:focus {
    border-color: #89d9e4;
    box-shadow: 0 0 0 2px rgba(78, 195, 211, 0.3);
  }

  .column-head {
    padding: 0 8px;
    color: #a9cbd1;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .option-list {
    min-height: 34px;
    overflow: auto;
  }

  .option-list button {
    width: 100%;
    min-height: 30px;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    color: #f4fbfc;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    text-align: left;
    cursor: default;
  }

  .option-list button.focused {
    border-color: rgba(147, 224, 233, 0.82);
    background: rgba(54, 139, 151, 0.72);
  }

  .option-list button.selected {
    color: #ffe184;
  }

  .uncategorized {
    color: #88a4aa;
    font-weight: 600;
  }

  .no-results {
    padding: 12px 8px;
    color: #a9cbd1;
    font-size: 12px;
    text-align: center;
  }

  .style-preview {
    position: absolute;
    top: -1px;
    left: 100%;
    display: grid;
    grid-template-rows: min-content minmax(0, 1fr);
    width: 330px;
    height: calc(100% + 2px);
    border: 1px solid #a8bdc2;
    border-radius: 0 8px 8px 0;
    background: #f8fbfb;
    box-shadow: 12px 14px 30px rgba(14, 44, 50, 0.22);
    color: #294950;
    overflow: hidden;
    box-sizing: border-box;
    pointer-events: auto;
  }

  .style-preview.preview-left {
    right: 100%;
    left: auto;
    border-radius: 8px 0 0 8px;
    box-shadow: -12px 14px 30px rgba(14, 44, 50, 0.22);
  }

  .style-preview > header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    min-height: 38px;
    padding: 8px 11px;
    border-bottom: 1px solid #cad9dc;
    background: #eaf2f3;
    box-sizing: border-box;
  }

  .style-preview > header strong {
    min-width: 0;
    overflow: hidden;
    color: #5f3e5d;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .style-preview > header span {
    flex: 0 0 auto;
    color: #758d92;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .preview-body {
    display: grid;
    align-content: start;
    gap: 10px;
    min-height: 0;
    padding: 10px;
    overflow: auto;
  }

  .preview-section {
    display: grid;
    gap: 4px;
  }

  .preview-section h3 {
    margin: 0;
    color: #6c858a;
    font-size: 10px;
    line-height: 1.4;
    text-transform: uppercase;
  }

  .preview-table {
    display: grid;
    grid-template-columns: minmax(90px, 0.8fr) minmax(120px, 1.2fr);
    border: 1px solid #d1dee0;
    border-radius: 5px;
    overflow: hidden;
  }

  .preview-table > span {
    min-width: 0;
    padding: 5px 7px;
    border-bottom: 1px solid #e0e9ea;
    font-size: 11px;
  }

  .preview-table > span:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .preview-property {
    background: #f0f6f7;
    color: #276d77;
    font-weight: 750;
    overflow-wrap: anywhere;
  }

  .preview-value {
    display: flex;
    align-items: baseline;
    gap: 5px;
    background: #ffffff;
    color: #384f54;
    font-family: Consolas, "Courier New", monospace;
  }

  .preview-value small {
    flex: 0 0 auto;
    color: #9a6e20;
    font-family: inherit;
    font-size: 9px;
    font-style: italic;
    font-weight: 800;
  }

  .preview-value span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-issues {
    display: grid;
    gap: 3px;
    padding: 7px 8px;
    border: 1px solid #dfb2b9;
    border-radius: 5px;
    background: #fff2f4;
    color: #914b59;
    font-size: 10px;
    font-weight: 700;
  }

  .preview-empty {
    padding: 14px 8px;
    color: #81969a;
    font-size: 11px;
    text-align: center;
  }
</style>
