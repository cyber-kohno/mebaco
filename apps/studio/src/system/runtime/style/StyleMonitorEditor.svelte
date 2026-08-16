<script lang="ts">
  import type TreeNode from '../../tree/tree-node'
  import StyleElement from '../../element/kind/view/style-element'
  import ElementStyleResolver from '../../element/kind/view/style-resolver'
  import FormulaContext from '../formula/formula-context'
  import RuntimeStyleResolver from './style-resolver'
  import StyleMonitor from './style-monitor'

  type Props = {
    rootNode: TreeNode.Node
    nodeId: number | null
    parentNodeId: number | null
    styleId: string
    rules: string
    bases: string
  }

  let { rootNode, nodeId, parentNodeId, styleId, rules, bases }: Props = $props()
  let activeState = $state<StyleElement.State | null>(null)

  const replaceStyle = (
    node: TreeNode.Node,
    targetNodeId: number,
    element: StyleElement.Element,
  ): TreeNode.Node => ({
    ...node,
    element: node.id === targetNodeId ? element : node.element,
    children: node.children.map((child) => replaceStyle(child, targetNodeId, element)),
  })

  const appendStyle = (
    node: TreeNode.Node,
    targetParentNodeId: number,
    element: StyleElement.Element,
  ): TreeNode.Node => ({
    ...node,
    children: node.id === targetParentNodeId
      ? [
          ...node.children,
          {
            id: Number.MIN_SAFE_INTEGER,
            element,
            isOpen: true,
            children: [],
          },
        ]
      : node.children.map((child) => appendStyle(child, targetParentNodeId, element)),
  })

  const preview = $derived.by(() => {
    const draft = StyleElement.create(
      styleId,
      StyleElement.parseRules(rules),
      StyleElement.parseBases(bases),
    )
    const previewRoot = nodeId != null
      ? replaceStyle(rootNode, nodeId, draft)
      : parentNodeId != null
        ? appendStyle(rootNode, parentNodeId, draft)
        : null
    if (previewRoot == null) return null
    const parameters = ElementStyleResolver
      .createCatalog(previewRoot)
      .resolve(styleId)
    const unresolved = parameters.parameters
      .filter((parameter) => parameter.defaultValue === undefined)

    if (parameters.issues.length > 0 || unresolved.length > 0) {
      return {
        result: StyleMonitor.create({ declarations: [], errors: [] }, activeState),
        unresolved,
        issues: parameters.issues.map((issue) => issue.message),
      }
    }

    const application = {
      referenceId: 'style-monitor',
      styleId,
      arguments: parameters.parameters.map((parameter) => ({
        parameterId: parameter.parameterId,
        binding: { type: 'default' as const },
      })),
    }
    const resolution = RuntimeStyleResolver
      .createCatalog(previewRoot)
      .resolve([application], FormulaContext.createEmpty())

    return {
      result: StyleMonitor.create(resolution, activeState),
      unresolved,
      issues: [],
    }
  })

  const formatSource = (
    declaration: RuntimeStyleResolver.Declaration,
  ): string => {
    const source = declaration.source.styleId === styleId
      ? 'Local'
      : declaration.source.styleId
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
</script>

<section class="style-monitor" aria-label="Resolved style monitor">
  <div class="state-segments" role="tablist" aria-label="Monitor state">
    <button type="button" class:active={activeState == null} onclick={() => activeState = null}>Default</button>
    {#each StyleElement.states as state}
      <button type="button" class:active={activeState === state} onclick={() => activeState = state}>:{state}</button>
    {/each}
  </div>

  {#if preview == null}
    <div class="notice">Style preview is unavailable.</div>
  {:else}
    <div class="monitor-body">
      {#if preview.issues.length > 0}
        <div class="error-list" role="alert">
          {#each preview.issues as issue}<div>{issue}</div>{/each}
        </div>
      {/if}

      {#if preview.unresolved.length > 0}
        <div class="unresolved-list">
          <strong>Unresolved Parameters</strong>
          {#each preview.unresolved as parameter}
            <span><b>{parameter.parameterId}</b> {parameter.valueType} from {parameter.sourceStyleId}</span>
          {/each}
        </div>
      {/if}

      {#if preview.result.errors.length > 0}
        <div class="error-list" role="alert">
          {#each preview.result.errors as error}
            <div>{RuntimeStyleResolver.formatError(error)}</div>
          {/each}
        </div>
      {/if}

      {#if preview.result.entries.length === 0}
        <div class="notice">No resolved properties</div>
      {:else}
        <div class="result-table">
          <div class="head">Property</div>
          <div class="head">Value</div>
          <div class="head">Source</div>
          {#each preview.result.entries as entry}
            {@const isLocal = entry.source.styleId === styleId}
            {@const overridesDefault = activeState != null
              && entry.state === activeState
              && entry.overridden.some((declaration) => declaration.state == null)}
            <div class="property" class:local={isLocal}>{entry.property}</div>
            <div class="value" class:local={isLocal}>{entry.value}</div>
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
                  <span>{entry.source.styleId}</span>
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
  .value { font-family: Consolas, "Courier New", monospace; }
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
