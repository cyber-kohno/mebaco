<script lang="ts">
  import { translatorStore } from '@system/application/localization'
  import { PRODUCT_INFO } from '@system/version'
  import { rejectionLabel, type DiagnosticsState } from './mcp-diagnostics'
  let { snapshot = null, failed = false }: DiagnosticsState = $props()
</script>

<h2>{$translatorStore('mcp.diagnostics.title')}</h2>
<p class="identity">
  Mebaco {PRODUCT_INFO.releaseVersion} · {$translatorStore(
    'mcp.diagnostics.generation',
  )}
  {PRODUCT_INFO.bridgeProtocolGen}
</p>
<p class="explanation">{$translatorStore('mcp.diagnostics.explanation')}</p>
{#if failed}
  <p role="status">{$translatorStore('mcp.diagnostics.unavailable')}</p>
{:else if snapshot == null}
  <p role="status">{$translatorStore('mcp.diagnostics.waiting')}</p>
{:else}
  <dl>
    <div>
      <dt>Session ID</dt>
      <dd>{snapshot.sessionId}</dd>
    </div>
    <div>
      <dt>{$translatorStore('mcp.diagnostics.accepted')}</dt>
      <dd>{snapshot.accepted}</dd>
    </div>
    <div>
      <dt>{$translatorStore('mcp.diagnostics.rejected')}</dt>
      <dd>{snapshot.rejected}</dd>
    </div>
  </dl>
  <h3>{$translatorStore('mcp.diagnostics.history')}</h3>
  {#if snapshot.history.length === 0}
    <p>{$translatorStore('mcp.diagnostics.noRejections')}</p>
  {:else}
    <div class="history">
      {#each snapshot.history as item}
        <article>
          <strong>{$translatorStore(rejectionLabel(item.code))}</strong>
          <code>{item.code}</code>
          <span
            >Studio: {item.studioGen} · {$translatorStore(
              'mcp.diagnostics.peer',
            )}: {item.peerGen ??
              $translatorStore('mcp.diagnostics.unknown')}</span
          >
          <span
            >{$translatorStore('mcp.diagnostics.count')}: {item.count} · {new Date(
              item.lastAtEpochMs,
            ).toLocaleString()}</span
          >
        </article>
      {/each}
    </div>
  {/if}
{/if}
<p class="help">{$translatorStore('mcp.diagnostics.help')}</p>

<style>
  h2 {
    margin: 0 0 12px;
    font-size: 19px;
  }
  h3 {
    font-size: 14px;
  }
  p {
    line-height: 1.6;
  }
  .identity {
    font-weight: 700;
  }
  .explanation,
  .help {
    color: var(--mbc-color-text-muted);
    font-size: 13px;
  }
  .help {
    border-top: 1px solid var(--mbc-color-border-strong);
    padding-top: 12px;
  }
  dl {
    font-size: 13px;
  }
  dl div {
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin: 8px 0;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
    text-align: right;
  }
  .history {
    display: grid;
    gap: 10px;
  }
  article {
    display: grid;
    gap: 5px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    padding: 10px;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  code {
    font-size: 11px;
  }
</style>
