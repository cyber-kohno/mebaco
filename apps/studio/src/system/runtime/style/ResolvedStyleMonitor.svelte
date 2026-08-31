<script lang="ts">
  import StyleElement from '../../element/kind/view/style/style-element'
  import type StyleParameterCatalog from '../../element/kind/view/style/style-parameter-catalog'
  import StyleDeclarationResolver from './style-declaration-resolver'
  import StyleMonitor from './style-monitor'

  type Props = {
    resolution: StyleDeclarationResolver.Result | null
    unresolved?: readonly StyleParameterCatalog.Parameter[]
    issues?: readonly string[]
    localStyleId?: string
    unavailableMessage?: string
  }

  let {
    resolution,
    unresolved = [],
    issues = [],
    localStyleId,
    unavailableMessage = 'Style preview is unavailable.',
  }: Props = $props()
  let activeState = $state<StyleElement.State | null>(null)

  const formulaPreviewMaxLength = 72

  const result = $derived(
    resolution == null
      ? null
      : StyleMonitor.create(resolution, activeState),
  )
  const displayErrors = $derived(
    result?.errors.filter((error) => {
      if (error.type !== 'formula') return true
      if (error.scriptError?.stage !== 'runtime') return true

      return result.entries.every((entry) => (
        entry.unresolved == null
        || entry.property !== error.property
        || entry.source.styleId !== error.styleId
        || !entry.source.path.every((pathItem, index) => pathItem === error.path[index])
        || entry.source.path.length !== error.path.length
      ))
    }) ?? [],
  )

  const formatSource = (
    declaration: StyleDeclarationResolver.Declaration,
  ): string => {
    const source = localStyleId != null && declaration.source.styleId === localStyleId
      ? 'Local'
      : declaration.source.path.at(-1) ?? declaration.source.styleId
    const state = declaration.state == null ? 'Default' : `:${declaration.state}`
    return `${source} (${state})`
  }

  const formatOverrideHistory = (
    entry: StyleMonitor.Entry,
  ): string => (
    [...entry.overridden, entry]
      .map(formatSource)
      .join(' -> ')
  )

  const formatValue = (
    entry: StyleMonitor.Entry,
  ): string => {
    if (entry.unresolved == null) return entry.value

    const normalizedSource = entry.unresolved.source.replace(/\s+/g, ' ').trim()
    const preview = normalizedSource.length > formulaPreviewMaxLength
      ? `${normalizedSource.slice(0, formulaPreviewMaxLength)}...`
      : normalizedSource
    return preview
  }

  const getValueTitle = (
    entry: StyleMonitor.Entry,
  ): string | undefined => entry.unresolved == null
    ? undefined
    : entry.unresolved.source
</script>

<section class="style-monitor" aria-label="Resolved style monitor">
  <div class="state-segments" role="tablist" aria-label="Monitor state">
    <button type="button" class:active={activeState == null} onclick={() => activeState = null}>Default</button>
    {#each StyleElement.states as state}
      <button type="button" class:active={activeState === state} onclick={() => activeState = state}>:{state}</button>
    {/each}
  </div>

  {#if result == null}
    <div class="notice">{unavailableMessage}</div>
  {:else}
    <div class="monitor-body">
      {#if issues.length > 0}
        <div class="error-list" role="alert">
          {#each issues as issue}<div>{issue}</div>{/each}
        </div>
      {/if}

      {#if unresolved.length > 0}
        <div class="unresolved-list">
          <strong>Unresolved Parameters</strong>
          {#each unresolved as parameter}
            <span><b>{parameter.id}</b> {parameter.valueType} from {parameter.sourceStyleName}</span>
          {/each}
        </div>
      {/if}

      {#if displayErrors.length > 0}
        <div class="error-list" role="alert">
          {#each displayErrors as error}
            <div>{StyleDeclarationResolver.formatError(error)}</div>
          {/each}
        </div>
      {/if}

      {#if result.entries.length === 0}
        <div class="notice">No resolved properties</div>
      {:else}
        <div class="result-table">
          <div class="head">Property</div>
          <div class="head">Value</div>
          <div class="head">Source</div>
          {#each result.entries as entry}
            {@const isLocal = localStyleId != null && entry.source.styleId === localStyleId}
            {@const overridesDefault = activeState != null
              && entry.state === activeState
              && entry.overridden.some((declaration) => declaration.state == null)}
            <div class="property" class:local={isLocal}>{entry.property}</div>
            <div
              class="value"
              class:local={isLocal}
              class:unresolved={entry.unresolved != null}
              title={getValueTitle(entry)}
            >{formatValue(entry)}</div>
            <div
              class="source"
              class:local={isLocal}
              title={entry.overridden.length > 0
                ? formatOverrideHistory(entry)
                : entry.source.path.join(' -> ')}
            >
              <div class="source-main">
                {#if isLocal}
                  <small class="local-origin">Local</small>
                {:else}
                  <span>{entry.source.path.at(-1) ?? entry.source.styleId}</span>
                {/if}
                {#if entry.state != null}
                  <small class="state-origin">:{entry.state}</small>
                {/if}
                <small>{entry.source.valueType}</small>
              </div>
              {#if overridesDefault}
                <div class="source-override">
                  <small class="default-override">Overrides Default</small>
                </div>
              {:else if entry.overridden.length > 0}
                <div class="source-override">
                  <small class="earlier-override">
                    Overrides {entry.overridden.length} earlier {entry.overridden.length === 1 ? 'definition' : 'definitions'}
                  </small>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .style-monitor {
    display: grid;
    grid-template-rows: min-content minmax(0, 1fr);
    gap: 10px;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .state-segments {
    display: flex;
    min-width: 0;
    overflow-x: auto;
  }

  .state-segments button {
    height: 28px;
    min-width: 0;
    padding: 0 10px;
    border: 1px solid var(--mbc-color-border-strong);
    border-right-width: 0;
    border-radius: 0;
    background: var(--mbc-color-surface-soft);
    color: #496970;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
  }

  .state-segments button:first-child { border-radius: 6px 0 0 6px; }
  .state-segments button:last-child { border-right-width: 1px; border-radius: 0 6px 6px 0; }
  .state-segments button.active { background: var(--mbc-color-primary-soft); color: #174d59; }

  .monitor-body {
    display: grid;
    align-content: start;
    gap: 10px;
    min-height: 0;
    padding-right: 4px;
    overflow: auto;
  }

  .result-table {
    display: grid;
    grid-template-columns: minmax(150px, 0.9fr) minmax(180px, 1.25fr) minmax(130px, 0.75fr);
    border: 1px solid rgba(154, 203, 212, 0.75);
    border-radius: 6px;
    overflow: hidden;
  }

  .result-table > div {
    min-width: 0;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(154, 203, 212, 0.45);
    color: #2b4850;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .result-table > div:nth-last-child(-n + 3) { border-bottom: 0; }
  .head { background: #eaf7fa; color: #617f86 !important; font-size: 11px !important; font-weight: 800; }
  .property { color: #236f7a !important; font-weight: 750; }
  .value {
    overflow: hidden;
    font-family: Consolas, "Courier New", monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .value.unresolved {
    color: #8a6c21;
    font-style: italic;
  }
  .source {
    display: grid;
    align-content: center;
    gap: 5px;
  }

  .source-main {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 5px 6px;
  }

  .source-override {
    display: flex;
    min-width: 0;
  }

  .source small { color: #789198; font-size: 10px; }

  .property.local {
    color: #155f6c !important;
    font-weight: 850;
  }

  .source .local-origin {
    color: #23717c;
    font-weight: 800;
  }

  .source .state-origin,
  .source .default-override {
    padding: 2px 5px;
    border-radius: 4px;
    font-weight: 800;
  }

  .source .state-origin {
    background: #e3f2d2;
    color: #55772a;
  }

  .source .default-override {
    border: 1px solid #55b7c5;
    background: #cceff4;
    color: #174d59;
  }

  .source .earlier-override {
    padding: 2px 5px;
    border-radius: 4px;
    background: #edf4f5;
    color: #8aa0a5;
    font-weight: 700;
  }

  .notice,
  .unresolved-list,
  .error-list {
    padding: 10px 12px;
    border: 1px solid rgba(154, 203, 212, 0.7);
    border-radius: 6px;
    background: rgba(244, 251, 252, 0.8);
    color: #6d8990;
    font-size: 12px;
  }

  .unresolved-list,
  .error-list { display: grid; gap: 5px; }
  .unresolved-list { border-color: var(--mbc-color-validation-warning-strong); background: var(--mbc-color-validation-warning); }
  .unresolved-list b { color: #66892e; }
  .error-list { border-color: var(--mbc-color-validation-error-strong); background: var(--mbc-color-validation-error); color: #914b59; }
</style>
