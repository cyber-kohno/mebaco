<script lang="ts">
  import RuntimeSessionStore from '../runtime-session-store'
  import PreviewController from './preview-controller'
  import RuntimeView from '../view/RuntimeView.svelte'

  const sessionStore = RuntimeSessionStore.store
</script>

{#if $sessionStore != null}
  <div class="runtime-scrim" role="presentation"></div>
  <section class="runtime-dialog" aria-label="Preview">
    <header class="runtime-header">
      <div class="runtime-title">Preview</div>
      <button type="button" aria-label="Close preview" onclick={PreviewController.close}>
        Close
      </button>
    </header>
    <div class="runtime-body">
      <RuntimeView
        appNode={$sessionStore.appNode}
        projectNode={$sessionStore.projectNode}
        resourceSession={$sessionStore.resourceSession}
        launcherId={$sessionStore.launcherId}
        launchValues={$sessionStore.launchValues}
      />
    </div>
  </section>
{/if}

<style>
  .runtime-scrim {
    position: absolute;
    z-index: 24;
    inset: 0;
    background: rgba(18, 55, 64, 0.18);
  }

  .runtime-dialog {
    position: absolute;
    z-index: 25;
    top: 64px;
    left: 64px;
    display: flex;
    flex-direction: column;
    width: calc(100% - 128px);
    height: calc(100% - 128px);
    min-width: 720px;
    min-height: 420px;
    border: 1px solid rgba(132, 198, 210, 0.78);
    border-radius: 8px;
    background: rgba(247, 252, 253, 0.98);
    box-shadow: 0 18px 42px rgba(18, 55, 64, 0.26);
    overflow: hidden;
  }

  .runtime-header {
    flex: 0 0 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 10px 0 14px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: rgba(234, 247, 250, 0.86);
    user-select: none;
  }

  .runtime-title {
    color: #2b4850;
    font-size: 14px;
    font-weight: 800;
  }

  button {
    min-width: 72px;
    height: 28px;
    padding: 0 12px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 8px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: default;
  }

  button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
    color: #1f6270;
  }

  .runtime-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    background: #f4fbfc;
  }
</style>
