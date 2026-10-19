<script lang="ts">
  import { translatorStore } from '@system/application/localization'
  import { MCP_BRIDGE_GEN } from '@system/version'
  import TauriMcp from '@system/infra/tauri/mcp'
  import McpSessionState from './mcp-session-state'
  import McpDiagnosticsView from './McpDiagnosticsView.svelte'
  import {
    createDiagnosticsPoller,
    type DiagnosticsState,
  } from './mcp-diagnostics'

  const details = McpSessionState.detailsStore
  let diagnosticsState = $state<DiagnosticsState>({
    snapshot: null,
    failed: false,
  })
  let dialog: HTMLDialogElement | undefined = $state()
  const poller = createDiagnosticsPoller(TauriMcp.diagnostics, (next) => {
    diagnosticsState = next
  })
  $effect(() => {
    const id = $details?.sessionId
    if (id != null) poller.start(id)
    return poller.stop
  })
</script>

{#if $details != null}
  <button
    class="mcp-status diagnostics-button"
    type="button"
    title={$translatorStore('mcp.diagnostics.open')}
    aria-label={$translatorStore('mcp.diagnostics.open')}
    onclick={() => dialog?.showModal()}
  >
    Gen {MCP_BRIDGE_GEN} · ⓘ{#if diagnosticsState.snapshot != null && diagnosticsState.snapshot.rejected > 0}
      <span class="rejections">{diagnosticsState.snapshot.rejected}</span>{/if}
  </button>
  <dialog
    bind:this={dialog}
    aria-label={$translatorStore('mcp.diagnostics.title')}
  >
    <button
      class="mcp-status dialog-close"
      type="button"
      aria-label={$translatorStore('mcp.diagnostics.close')}
      onclick={() => dialog?.close()}>×</button
    >
    <McpDiagnosticsView {...diagnosticsState} />
  </dialog>
{/if}

<style>
  .diagnostics-button {
    height: 24px;
    padding: 0 8px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 8px;
    background: var(--mbc-color-surface-soft);
    color: var(--mbc-color-text-muted);
    cursor: pointer;
    white-space: nowrap;
    font-size: 12px;
  }
  .rejections {
    color: #a5323d;
    font-weight: 700;
    margin-left: 4px;
  }
  dialog {
    box-sizing: border-box;
    width: min(620px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    overflow: auto;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 12px;
    padding: 24px;
    color: var(--mbc-color-text);
    background: var(--mbc-color-surface-soft);
  }
  dialog::backdrop {
    background: #0005;
  }
  .dialog-close {
    float: right;
    margin: -8px -8px 8px 12px;
    width: 28px;
    height: 28px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface-soft);
    cursor: pointer;
    font-size: 20px;
  }
  button:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }
</style>
