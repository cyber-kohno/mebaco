<script lang="ts">
  import { onDestroy } from 'svelte'
  import { toastStore } from './toast-state'
  import ToastController from './toast-controller'
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  $effect(() => {
    const active = new Set($toastStore.map((item) => item.id))
    $toastStore.forEach((item) => {
      if (timers.has(item.id)) return
      timers.set(item.id, setTimeout(() => { timers.delete(item.id); ToastController.dismiss(item.id) }, item.durationMs))
    })
    timers.forEach((timer, id) => { if (!active.has(id)) { clearTimeout(timer); timers.delete(id) } })
  })
  onDestroy(() => timers.forEach(clearTimeout))
</script>
<div class="toast-layer" aria-live="polite">
  {#each $toastStore as toast (toast.id)}
    <div class="toast" data-tone={toast.tone}>{toast.message}</div>
  {/each}
</div>
<style>
  .toast-layer { position: fixed; z-index: 10000; right: 18px; bottom: 18px; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
  .toast { min-width: 220px; max-width: 420px; padding: 9px 13px; border: 1px solid var(--mbc-color-border-strong); border-radius: 7px; background: var(--mbc-color-surface); color: var(--mbc-color-text); font-size: 13px; font-weight: 700; box-shadow: 0 8px 22px rgba(18,55,64,.2); }
  .toast[data-tone='success'] { border-color: #75ad82; background: #effaf1; color: #28613a; }
  .toast[data-tone='warning'] { border-color: #d58b4a; background: #fff0e5; color: #8a481f; }
  .toast[data-tone='danger'] { border-color: #d58e8e; background: #fff1f1; color: #833b3b; }
</style>
