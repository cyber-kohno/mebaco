<script lang="ts">
  import { appAreaStore, type AppArea } from '../navigation/app-area-store'

  const areas: readonly { id: AppArea; label: string }[] = [
    { id: 'client', label: 'Client' },
    { id: 'develop', label: 'Develop' },
    { id: 'setting', label: 'Setting' },
  ]
</script>

<nav class="mode-navigation" aria-label="Application mode">
  <div class="mode-tabs" role="tablist">
    {#each areas as area}
      <button
        type="button"
        role="tab"
        id={`${area.id}-area-tab`}
        class:active={$appAreaStore === area.id}
        aria-selected={$appAreaStore === area.id}
        aria-controls={`${area.id}-area-panel`}
        onclick={() => appAreaStore.set(area.id)}
      >{area.label}</button>
    {/each}
  </div>
</nav>

<style>
  .mode-navigation,
  .mode-tabs {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .mode-tabs {
    gap: 2px;
  }

  button {
    min-width: 92px;
    height: 100%;
    padding: 0 18px;
    border-bottom: 3px solid transparent;
    background: transparent;
    color: var(--mbc-color-text-muted);
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    cursor: default;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease;
  }

  button:hover {
    background: var(--mbc-color-primary-soft);
    color: #236f7a;
  }

  button.active {
    border-bottom-color: var(--mbc-color-primary);
    background: rgba(221, 245, 248, 0.72);
    color: #1f6270;
  }

  button:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: -4px;
  }
</style>
