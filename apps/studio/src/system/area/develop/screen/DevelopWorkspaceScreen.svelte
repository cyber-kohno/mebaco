<script lang="ts">
  import { developInteractionStore } from '../interaction/develop-interaction-store'
  import TreeView from '../../../tree/TreeView.svelte'
</script>

<section
  class="develop-workspace-screen"
  class:copy-mode={$developInteractionStore.type === 'tree-transfer' && $developInteractionStore.operation === 'copy'}
  class:move-mode={$developInteractionStore.type === 'tree-transfer' && $developInteractionStore.operation === 'move'}
  aria-label="Mebaco develop workspace"
>
  <TreeView />
  {#if $developInteractionStore.type === 'tree-transfer'}
    <div class="interaction-banner" role="status">
      {$developInteractionStore.operation === 'copy' ? 'Copy' : 'Move'} mode —
      {$developInteractionStore.sourceKind} "{$developInteractionStore.sourceLabel}"
      · Select a destination · Esc cancel
    </div>
  {/if}
</section>

<style>
  .develop-workspace-screen {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    --mbc-develop-workspace-background: var(--mbc-color-surface);
    background: var(--mbc-develop-workspace-background);
    transition: background-color 140ms ease;
  }

  .develop-workspace-screen.copy-mode {
    --mbc-develop-workspace-background: #e5f2fb;
  }

  .develop-workspace-screen.move-mode {
    --mbc-develop-workspace-background: #fff0cf;
  }

  .interaction-banner {
    position: absolute;
    z-index: 20;
    left: 12px;
    top: 10px;
    padding: 6px 10px;
    border: 1px solid rgba(30, 91, 126, 0.58);
    border-radius: 5px;
    background: rgba(18, 55, 64, 0.92);
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    pointer-events: none;
  }
</style>
