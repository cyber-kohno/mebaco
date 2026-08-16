<script lang="ts">
  import { restartApp } from "../app/restart-app";
  import ProjectFile from "../project/project-file";
  import { screenStore } from "../store/screen-store";
</script>

<header class="app-header" aria-label="Application navigation">
  <nav class="actions" aria-label="Screen actions">
    {#if $screenStore === "start"}{:else if $screenStore === "develop"}
      <button type="button" onclick={ProjectFile.saveAsWithAlert}>Save</button>
      <button type="button" onclick={() => screenStore.set("start")}
        >Close</button
      >
    {/if}
    <button type="button" onclick={restartApp}>Restart</button>
  </nav>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex: 0 0 44px;
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: rgba(255, 255, 255, 0.78);
    color: var(--mbc-color-text);
    user-select: none;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  button {
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

  button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
    color: #1f6270;
  }

  button:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }
</style>
