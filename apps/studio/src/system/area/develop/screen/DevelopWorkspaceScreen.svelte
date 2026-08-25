<script lang="ts">
  import TreeView from '../../../tree/TreeView.svelte'
</script>

<section class="develop-workspace-screen" aria-label="Mebaco develop workspace">
  <TreeView />
</section>

<style>
  .develop-workspace-screen {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--mbc-color-surface);
  }
</style>
