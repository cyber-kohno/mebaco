<script lang="ts">
  import RuntimeSessionStore from '../runtime-session-store'
  import RuntimeView from './RuntimeView.svelte'

  const sessionStore = RuntimeSessionStore.store
</script>

{#if $sessionStore != null}
  <main class="direct-runtime" aria-label="Mebaco application">
    <RuntimeView
      appNode={$sessionStore.appNode}
      projectNode={$sessionStore.projectNode}
      resourceSession={$sessionStore.resourceSession}
      storageSession={$sessionStore.storageSession}
      logSession={$sessionStore.logSession}
      launcherId={$sessionStore.launcherId}
      launchValues={$sessionStore.launchValues}
    />
  </main>
{/if}

<style>
  .direct-runtime {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: white;
    font-size: 13px;
  }
</style>
