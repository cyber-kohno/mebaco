<script lang="ts">
  import { developInteractionStore } from '../interaction/develop-interaction-store'
  import TreeView from '../../../tree/TreeView.svelte'
  import TreeDestinationOperation from '../../../tree/destination/tree-destination-operation'

  const transaction = $derived(
    $developInteractionStore.type === 'destination-transaction'
      ? $developInteractionStore
      : null,
  )
  const presentation = $derived(
    transaction == null ? null : TreeDestinationOperation.getPresentation(transaction),
  )
</script>

<section
  class="develop-workspace-screen"
  class:destination-mode={transaction != null}
  aria-label="Mebaco develop workspace"
>
  <TreeView />
  {#if transaction != null && presentation != null}
    <div class="interaction-banner" role="status">
      {presentation.modeLabel} mode —
      "{transaction.sourceLabel}"
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

  .develop-workspace-screen.destination-mode {
    --mbc-develop-workspace-background: #e5f2fb;
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
