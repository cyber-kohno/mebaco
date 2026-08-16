<script lang="ts">
  import TreeView from '../../tree/TreeView.svelte'
</script>

<section class="develop-screen" aria-label="Mebaco develop">
  <TreeView />
</section>

<style>
  .develop-screen {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--mbc-color-surface);
  }
</style>
