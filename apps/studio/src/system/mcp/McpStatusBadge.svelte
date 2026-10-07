<script lang="ts">
  import { translatorStore } from '@system/application/localization'
  import McpSessionState from './mcp-session-state'
  import McpEditSessionState from './mcp-edit-session-state'
  import McpEditSessionController from './mcp-edit-session-controller'
  import {
    getMcpStatusPresentation,
    shortenMcpSessionId,
  } from './mcp-status-presentation'

  const sessionStatusStore = McpSessionState.store
  const sessionDetailsStore = McpSessionState.detailsStore
  const editSessionStore = McpEditSessionState.store
</script>

{#if $sessionStatusStore !== 'stopped' || $editSessionStore != null}
  {@const checkout = $editSessionStore}
  {@const presentation = getMcpStatusPresentation($sessionStatusStore, checkout != null, checkout?.recoveryRequired ?? false)}
  <svelte:element
    this={checkout == null ? 'div' : 'button'}
    type={checkout == null ? undefined : 'button'}
    class="mcp-status {presentation.tone}"
    role={checkout == null ? 'status' : undefined}
    aria-live="polite"
    aria-label={`${$translatorStore(presentation.labelKey)}${$sessionDetailsStore == null ? '' : `, Session ID: ${$sessionDetailsStore.sessionId}`}${checkout == null ? '' : `, ${$translatorStore('mcp.edit.release.action')}`}`}
    title={[
      $sessionDetailsStore == null ? '' : `Session ID: ${$sessionDetailsStore.sessionId}\nEndpoint: ${$sessionDetailsStore.endpoint}\nPID: ${$sessionDetailsStore.pid}`,
      checkout == null ? '' : `${$translatorStore('mcp.edit.lockInfo')}\nCheckout session ID: ${checkout.sessionId}\nCheckout ID: ${checkout.checkoutId}\nStarted revision: ${checkout.startedRevision}\n${$translatorStore('mcp.edit.release.hint')}`,
    ].filter(Boolean).join('\n') || undefined}
    onclick={checkout == null ? undefined : McpEditSessionController.release}
  >
    <span class="indicator" aria-hidden="true"></span>
    <span>{$translatorStore(presentation.labelKey)}</span>
    {#if $sessionDetailsStore != null}
      <span class="session-id" aria-hidden="true">· {shortenMcpSessionId($sessionDetailsStore.sessionId)}</span>
    {/if}
  </svelte:element>
{/if}

<style>
  .mcp-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
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
    flex-shrink: 0;
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

  button.mcp-status {
    font-family: inherit;
    cursor: pointer;
  }

  button.mcp-status:hover {
    filter: brightness(0.97);
  }

  button.mcp-status:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }

  .mcp-status.editing {
    border-color: #dcc68a;
    background: #fff9e8;
    color: #87691a;
  }
</style>
