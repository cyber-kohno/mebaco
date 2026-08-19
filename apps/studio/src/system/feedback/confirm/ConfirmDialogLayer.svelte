<script lang="ts">
  import { confirmDialogStore } from './confirm-dialog-state'
  import ConfirmDialogController from './confirm-dialog-controller'
  const select = (index: number) => { confirmDialogStore.update((value) => value == null ? value : ({ ...value, focus: index })); ConfirmDialogController.apply() }
</script>
{#if $confirmDialogStore != null}
  <div class="overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) ConfirmDialogController.clear() }} onkeydown={(event) => event.stopPropagation()}>
    <section class="dialog" data-tone={$confirmDialogStore.tone} role="alertdialog" aria-modal="true" aria-label={$confirmDialogStore.title ?? 'Confirmation'}>
      {#if $confirmDialogStore.title}<h2>{$confirmDialogStore.title}</h2>{/if}
      <div class="message">{#each $confirmDialogStore.message as line}<div>{line}</div>{/each}</div>
      <div class="choices">{#each $confirmDialogStore.choices as choice, index}<button class:focused={index === $confirmDialogStore.focus} data-role={choice.role ?? 'neutral'} type="button" onclick={() => select(index)}>{choice.label}</button>{/each}</div>
    </section>
  </div>
{/if}
<style>
  .overlay { position: fixed; z-index: 11000; inset: 0; display: grid; place-items: center; background: rgba(18,55,64,.28); }
  .dialog { width: min(520px, calc(100vw - 32px)); padding: 20px; border: 1px solid var(--mbc-color-border-strong); border-radius: 9px; background: var(--mbc-color-surface); color: var(--mbc-color-text); font-size: 14px; line-height: 1.4; box-shadow: 0 18px 42px rgba(18,55,64,.3); }
  .dialog[data-tone='danger'] { border-color: #d58e8e; }
  h2 { margin: 0 0 12px; font-size: 18px; } .message { font-size: 14px; line-height: 1.6; }
  .choices { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; } button { min-width: 78px; padding: 7px 12px; border: 1px solid var(--mbc-color-border-strong); border-radius: 6px; background: var(--mbc-color-surface-soft); color: var(--mbc-color-text); font-family: inherit; font-size: 13px; line-height: 1.4; font-weight: 700; } button.focused, button:hover { border-color: var(--mbc-color-primary); background: var(--mbc-color-primary-soft); }
</style>
