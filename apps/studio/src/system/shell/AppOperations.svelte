<script lang="ts">
  import { restartApp } from '../app/restart-app'
  import DevelopOperations from '../area/develop/DevelopOperations.svelte'
  import { appAreaStore } from '../navigation/app-area-store'
</script>

<nav class="operations" aria-label="Application operations">
  {#if $appAreaStore === 'develop'}
    <DevelopOperations />
  {/if}
  <button type="button" onclick={restartApp}>Restart</button>
</nav>

<style>
  .operations {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .operations :global(button) {
    min-width: 78px;
    height: 28px;
    padding: 0 14px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 8px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    cursor: default;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease;
  }

  .operations :global(button:disabled) {
    opacity: 0.45;
  }

  .operations :global(button:not(:disabled):hover) {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
    color: #1f6270;
  }

  .operations :global(button:focus-visible) {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }
</style>
