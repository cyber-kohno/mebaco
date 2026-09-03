<script lang="ts">
  import { tick } from 'svelte'
  import bodyPortal from '../ui/body-portal'
  import ElementSearchController from './element-search-controller'
  import ElementSearchQuery from './element-search-query'
  import { elementSearchStore } from './element-search-store'
  import type ElementSearchTypes from './element-search-types'
  import HighlightedSearchText from './HighlightedSearchText.svelte'

  const ROW_HEIGHT = 32
  const OVERSCAN = 8

  let inputElement = $state<HTMLInputElement | undefined>(undefined)
  let resultViewport = $state<HTMLDivElement | undefined>(undefined)
  let session = $state<ElementSearchTypes.Session | null>(null)
  let scrollTop = $state(0)
  let viewportHeight = $state(0)

  $effect(() => elementSearchStore.subscribe((value) => {
    session = value
  }))

  const query = $derived(ElementSearchQuery.parse(session?.query ?? ''))
  const results = $derived(
    session == null ? [] : ElementSearchQuery.filter(session.entries, session.query),
  )
  const startIndex = $derived(Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN,
  ))
  const endIndex = $derived(Math.min(
    results.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  ))
  const visibleRows = $derived(
    results.slice(startIndex, endIndex).map((entry, offset) => ({
      entry,
      index: startIndex + offset,
    })),
  )

  $effect(() => {
    if (session == null) return
    let cancelled = false
    void tick().then(() => {
      if (!cancelled) inputElement?.focus()
    })
    return () => {
      cancelled = true
    }
  })

  $effect(() => {
    const viewport = resultViewport
    if (viewport == null) return

    const updateHeight = () => {
      viewportHeight = viewport.clientHeight
    }
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(viewport)
    return () => observer.disconnect()
  })

  $effect(() => {
    const selectedIndex = session?.selectedIndex ?? -1
    const viewport = resultViewport
    if (selectedIndex < 0 || viewport == null || viewportHeight === 0) return

    const rowTop = selectedIndex * ROW_HEIGHT
    const rowBottom = rowTop + ROW_HEIGHT
    if (rowTop < viewport.scrollTop) viewport.scrollTop = rowTop
    else if (rowBottom > viewport.scrollTop + viewportHeight) {
      viewport.scrollTop = rowBottom - viewportHeight
    }
    scrollTop = viewport.scrollTop
  })

  const handleInput = (event: Event) => {
    ElementSearchController.setQuery((event.currentTarget as HTMLInputElement).value)
    if (resultViewport != null) resultViewport.scrollTop = 0
    scrollTop = 0
  }

  const handleModalFocusout = (event: FocusEvent) => {
    const modal = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && modal.contains(event.relatedTarget)) return
    setTimeout(() => inputElement?.focus(), 0)
  }
</script>

<svelte:window onkeydown={ElementSearchController.handleKeydown} />

{#if session != null}
  <div class="layer" use:bodyPortal>
    <div
      class="scrim"
      role="presentation"
      onclick={(event) => {
        if (event.target === event.currentTarget) ElementSearchController.close()
      }}
    ></div>
    <div
      class="search-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Search elements"
      tabindex="-1"
      onfocusout={handleModalFocusout}
    >
      <div class="search-input-row">
        <input
          bind:this={inputElement}
          value={session.query}
          aria-label="Search elements by ID and kind"
          aria-controls="element-search-results"
          aria-activedescendant={session.selectedIndex >= 0
            ? `element-search-result-${session.selectedIndex}`
            : undefined}
          autocomplete="off"
          spellcheck="false"
          placeholder="ID kind"
          oninput={handleInput}
        />
      </div>

      <div
        bind:this={resultViewport}
        id="element-search-results"
        class="result-viewport"
        role="listbox"
        aria-label="Element search results"
        onscroll={(event) => {
          scrollTop = event.currentTarget.scrollTop
        }}
      >
        {#if results.length === 0}
          <div class="empty-result">No elements found.</div>
        {:else}
          <div
            class="result-space"
            style={`height: ${results.length * ROW_HEIGHT}px;`}
          >
            {#each visibleRows as row (row.entry.nodeId)}
              <button
                id={`element-search-result-${row.index}`}
                type="button"
                class="result-row"
                class:selected={row.index === session.selectedIndex}
                role="option"
                aria-selected={row.index === session.selectedIndex}
                aria-posinset={row.index + 1}
                aria-setsize={results.length}
                style={`transform: translateY(${row.index * ROW_HEIGHT}px);`}
                onmouseenter={() => ElementSearchController.setSelectedIndex(row.index)}
                onclick={() => ElementSearchController.activate(row.entry)}
              >
                <span class="kind-column">
                  <HighlightedSearchText
                    text={row.entry.kind}
                    searchText={query.kind.text}
                    exact={query.kind.exact}
                  />
                </span>
                <span class="address-column">{row.entry.address}</span>
                <span class="id-column">
                  <HighlightedSearchText
                    text={row.entry.idText}
                    searchText={query.id.text}
                    exact={query.id.exact}
                  />
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .layer {
    position: fixed;
    z-index: 12000;
    inset: 0;
    pointer-events: none;
    --search-scrim: rgba(30, 58, 64, 0.14);
    --search-border: #9bb8be;
    --search-surface: #f8fbfc;
    --search-header: #edf5f6;
    --search-divider: #c9dadd;
    --search-text: #203d44;
    --search-subtle: #667f85;
    --search-kind: #176a78;
    --search-input-border: #5795a0;
    --search-input-background: #ffffff;
    --search-input-text: #183840;
    --search-placeholder: #80969b;
    --search-row-divider: rgba(103, 139, 147, 0.18);
    --search-row-active: #dceff2;
    --search-focus: #3b8f9d;
    --search-mark-background: #ffe08a;
    --search-mark-text: #263a3f;
    --search-exact-mark-background: #ff8494;
    --search-exact-mark-text: #3b175f;
    --search-shadow: 0 16px 36px rgba(39, 67, 74, 0.24);
  }

  .scrim {
    position: fixed;
    z-index: 0;
    inset: 0;
    background: var(--search-scrim);
    pointer-events: auto;
  }

  .search-modal {
    position: fixed;
    z-index: 1;
    top: 24px;
    left: 24px;
    display: flex;
    flex-direction: column;
    width: min(920px, calc(100% - 48px));
    height: min(520px, calc(100% - 48px));
    min-height: 240px;
    border: 1px solid var(--search-border);
    border-radius: 6px;
    background: var(--search-surface);
    box-shadow: var(--search-shadow);
    color: var(--search-text);
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    overflow: hidden;
    pointer-events: auto;
  }

  .search-input-row {
    flex: 0 0 auto;
    padding: 10px 12px;
    border-bottom: 1px solid var(--search-divider);
    background: var(--search-header);
  }

  input {
    box-sizing: border-box;
    width: 100%;
    height: 32px;
    padding: 0 9px;
    border: 1px solid var(--search-input-border);
    border-radius: 3px;
    background: var(--search-input-background);
    color: var(--search-input-text);
    font: inherit;
    outline: none;
  }

  input::placeholder {
    color: var(--search-placeholder);
  }

  .result-viewport {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .result-space {
    position: relative;
    width: 100%;
  }

  .result-row {
    position: absolute;
    top: 0;
    left: 0;
    display: grid;
    grid-template-columns: 180px minmax(220px, 1fr) minmax(180px, 1fr);
    align-items: center;
    width: 100%;
    height: 32px;
    padding: 0 12px;
    border: 0;
    border-bottom: 1px solid var(--search-row-divider);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: default;
  }

  .result-row.selected,
  .result-row:hover {
    background: var(--search-row-active);
  }

  .result-row:focus-visible {
    outline: 1px solid var(--search-focus);
    outline-offset: -1px;
  }

  .kind-column,
  .address-column,
  .id-column {
    overflow: hidden;
    padding-right: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kind-column {
    color: var(--search-kind);
  }

  .address-column {
    color: var(--search-subtle);
    font-variant-numeric: tabular-nums;
  }

  .id-column {
    color: var(--search-text);
  }

  .empty-result {
    padding: 18px 12px;
    color: var(--search-subtle);
  }
</style>
