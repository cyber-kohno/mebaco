<script lang="ts">
  import AppModeTabs from './AppModeTabs.svelte'
  import AppOperations from './AppOperations.svelte'
</script>

<header class="app-header" aria-label="Application navigation">
  <AppModeTabs />
  <AppOperations />
</header>

<style>
  .app-header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex: 0 0 44px;
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 4px 8px -4px rgba(31, 98, 112, 0.28);
    color: var(--mbc-color-text);
    user-select: none;
  }
</style>
