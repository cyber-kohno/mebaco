<script lang="ts">
  import { tick } from 'svelte'
  import DevelopInteractionController from '../../area/develop/interaction/develop-interaction-controller'
  import { developInteractionStore } from '../../area/develop/interaction/develop-interaction-store'
  import TreeDestinationController from './tree-destination-controller'

  let inputElement: HTMLInputElement | undefined = $state()
  let name = $state('')
  let submitError = $state<string | null>(null)
  let busy = $state(false)
  let initializedSessionKey = $state('')
  const session = $derived(
    $developInteractionStore.type === 'destination-transaction'
    && $developInteractionStore.phase === 'confirm'
      ? $developInteractionStore
      : null,
  )
  const presentation = $derived(session == null ? null : TreeDestinationController.getPresentation())
  const nameError = $derived(session == null ? null : TreeDestinationController.getNameError(name))

  $effect(() => {
    const sessionKey = session == null
      ? ''
      : `${session.operation.type}:${session.sourceNodeId}:${session.destinationNodeId}`
    if (sessionKey.length === 0) {
      initializedSessionKey = ''
      return
    }
    if (sessionKey === initializedSessionKey) return
    initializedSessionKey = sessionKey
    name = TreeDestinationController.getSuggestedName()
    submitError = null
    void tick().then(() => {
      inputElement?.focus()
      inputElement?.select()
    })
  })

  const submit = async () => {
    if (session == null || presentation == null || nameError != null || busy) return
    busy = true
    submitError = null
    const result = await TreeDestinationController.commit(name)
    busy = false
    if (!result.ok) submitError = result.error ?? presentation.failureMessage
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (session == null) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      DevelopInteractionController.cancel()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      void submit()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if session != null && presentation != null}
  <div class="scrim" role="presentation"></div>
  <dialog open class="dialog" aria-label={presentation.dialogTitle} aria-modal="true">
    <h2>{presentation.dialogTitle}</h2>
    <dl>
      <div><dt>Source</dt><dd>{session.sourceLabel}</dd></div>
      <div><dt>Destination</dt><dd>node-{session.destinationNodeId}</dd></div>
    </dl>
    <label for="tree-destination-id">Id</label>
    <input
      id="tree-destination-id"
      bind:this={inputElement}
      bind:value={name}
      aria-invalid={nameError != null}
      autocomplete="off"
      spellcheck="false"
      disabled={busy}
    />
    {#if nameError != null}<div class="error">{nameError}</div>{/if}
    {#if submitError != null}<div class="error">{submitError}</div>{/if}
    <div class="actions">
      <button type="button" onclick={() => DevelopInteractionController.cancel()} disabled={busy}>Cancel</button>
      <button type="button" class="primary" onclick={() => { void submit() }} disabled={busy || nameError != null}>
        {busy ? 'Checking…' : presentation.confirmLabel}
      </button>
    </div>
  </dialog>
{/if}

<style>
  .scrim {
    position: fixed;
    z-index: 10400;
    inset: 0;
    background: rgba(18, 55, 64, 0.24);
  }

  .dialog {
    position: fixed;
    z-index: 10410;
    left: 50%;
    top: 50%;
    width: min(460px, calc(100vw - 32px));
    margin: 0;
    padding: 20px;
    transform: translate(-50%, -50%);
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 9px;
    background: var(--mbc-color-surface);
    color: var(--mbc-color-text);
    font-size: 14px;
    box-shadow: 0 18px 42px rgba(18, 55, 64, 0.3);
  }

  h2 { margin: 0 0 16px; font-size: 18px; }
  dl { display: grid; gap: 6px; margin: 0 0 16px; }
  dl div { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 8px; }
  dt { color: var(--mbc-color-text-subtle); font-weight: 700; }
  dd { margin: 0; overflow: hidden; text-overflow: ellipsis; }
  label { display: block; margin-bottom: 5px; font-weight: 700; }
  input {
    box-sizing: border-box;
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 5px;
    background: #ffffff;
    color: var(--mbc-color-text);
    font: inherit;
  }
  input:focus { border-color: var(--mbc-color-primary); outline: 2px solid rgba(46, 170, 187, 0.2); }
  input[aria-invalid='true'] { border-color: #cf5262; }
  .error { margin-top: 6px; color: #bd3044; font-size: 12px; font-weight: 700; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
  button {
    min-width: 82px;
    padding: 7px 12px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface-soft);
    color: var(--mbc-color-text);
    font: inherit;
    font-weight: 700;
  }
  button.primary { border-color: var(--mbc-color-primary); background: var(--mbc-color-primary-soft); }
  button:disabled { cursor: default; opacity: 0.55; }
</style>
