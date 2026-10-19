<script lang="ts">
  import LogOut from '@lucide/svelte/icons/log-out'
  import RuntimeSessionStore from '../runtime-session-store'
  import RuntimeView from './RuntimeView.svelte'
  import { translatorStore } from '@system/application/localization'

  const sessionStore = RuntimeSessionStore.store
</script>

{#if $sessionStore?.presentation?.type === 'application'}
  <section class="application-runtime" aria-label={$translatorStore('runtime.application.label')}>
    <header class="application-header">
      <strong>{$sessionStore.presentation.title}</strong>
      <button type="button" onclick={RuntimeSessionStore.close}>
        <LogOut size={16} />
        {$translatorStore('runtime.application.exit')}
      </button>
    </header>
    <div class="application-body">
      {#key $sessionStore}
        <RuntimeView
          appNode={$sessionStore.appNode}
          projectNode={$sessionStore.projectNode}
          resourceSession={$sessionStore.resourceSession}
          storageSession={$sessionStore.storageSession}
          logSession={$sessionStore.logSession}
          launcherId={$sessionStore.launcherId}
          launchValues={$sessionStore.launchValues}
        />
      {/key}
    </div>
  </section>
{/if}

<style>
  .application-runtime {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--mbc-color-surface);
    color: var(--mbc-color-text);
    font-size: 13px;
  }

  .application-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 0 0 44px;
    gap: 16px;
    padding: 0 14px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: var(--mbc-color-surface-soft);
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    gap: 7px;
    height: 28px;
    padding: 0 12px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 7px;
    background: var(--mbc-color-surface);
    color: #236f7a;
    font: inherit;
    font-weight: 700;
  }

  button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }

  button:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }

  .application-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }
</style>
