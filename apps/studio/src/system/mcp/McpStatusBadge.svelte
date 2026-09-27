<script lang="ts">
  import { translatorStore } from '@system/application/localization'
  import McpSessionState from './mcp-session-state'
  import {
    getMcpStatusPresentation,
    shortenMcpSessionId,
  } from './mcp-status-presentation'

  const sessionStatusStore = McpSessionState.store
  const sessionDetailsStore = McpSessionState.detailsStore
</script>

{#if $sessionStatusStore !== 'stopped'}
  {@const presentation = getMcpStatusPresentation($sessionStatusStore)}
  <div
    class="mcp-status {presentation.tone}"
    role="status"
    aria-live="polite"
    aria-label={`${$translatorStore(presentation.labelKey)}${$sessionDetailsStore == null ? '' : `, Session ID: ${$sessionDetailsStore.sessionId}`}`}
    title={$sessionDetailsStore == null ? undefined : `Session ID: ${$sessionDetailsStore.sessionId}\nEndpoint: ${$sessionDetailsStore.endpoint}\nPID: ${$sessionDetailsStore.pid}`}
  >
    <span class="indicator" aria-hidden="true"></span>
    <span>{$translatorStore(presentation.labelKey)}</span>
    {#if $sessionDetailsStore != null}
      <span class="session-id" aria-hidden="true">· {shortenMcpSessionId($sessionDetailsStore.sessionId)}</span>
    {/if}
  </div>
{/if}

<style>
  .mcp-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    margin-right: 8px;
    padding: 0 14px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 999px;
    background: var(--mbc-color-surface-soft);
    color: var(--mbc-color-text-muted);
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  .indicator {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .session-id {
    color: #043049;
    font-family: ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .mcp-status.available {
    border-color: #8fcbd3;
    background: #e8f7f8;
    color: #247b87;
  }

  .mcp-status.connected {
    border-color: #9bcbb1;
    background: #edf8f1;
    color: #237146;
  }

  .mcp-status.pending {
    border-color: #dcc68a;
    background: #fff9e8;
    color: #87691a;
  }

  .mcp-status.error {
    border-color: #e2a8ae;
    background: #fff0f1;
    color: #a5323d;
  }
</style>
