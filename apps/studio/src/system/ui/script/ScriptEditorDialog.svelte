<script lang="ts">
  import MonacoScriptEditor from '../monaco/MonacoScriptEditor.svelte'
  import type MonacoInjection from '../monaco/monaco-injection'
  import bodyPortal from '../portal/body-portal'

  type Props = {
    value: string
    title: string
    dialogLabel: string
    mode: MonacoInjection.Mode
    onValueChange: (value: string) => void
    onBack: () => void
    injectionSource?: string
    expectedType?: MonacoInjection.ExpectedType
    expectedTypeText?: string
    allowAwait?: boolean
    onDiagnosticsChange?: (messages: string[]) => void
  }

  let {
    value,
    title,
    dialogLabel,
    mode,
    onValueChange,
    onBack,
    injectionSource,
    expectedType,
    expectedTypeText,
    allowAwait = false,
    onDiagnosticsChange,
  }: Props = $props()
</script>

<div use:bodyPortal>
  <div class="script-scrim" role="presentation"></div>
  <section class="script-dialog" aria-label={dialogLabel}>
    <header class="script-dialog-header">
      <div>{title}</div>
      <button type="button" onclick={onBack}>Back</button>
    </header>
    <div class="script-expanded-editor">
      <MonacoScriptEditor
        {value}
        {mode}
        height="100%"
        {injectionSource}
        {expectedType}
        {expectedTypeText}
        {allowAwait}
        {onDiagnosticsChange}
        onValueChange={onValueChange}
      />
    </div>
  </section>
</div>

<style>
  .script-scrim {
    position: fixed;
    z-index: 1000;
    inset: 0;
    background: rgba(18, 55, 64, 0.24);
  }

  .script-dialog {
    position: fixed;
    z-index: 1001;
    inset: 64px;
    display: flex;
    flex-direction: column;
    min-width: 720px;
    min-height: 460px;
    border: 1px solid rgba(132, 198, 210, 0.8);
    border-radius: 8px;
    background: rgba(247, 252, 253, 0.98);
    box-shadow: 0 18px 42px rgba(18, 55, 64, 0.28);
    overflow: hidden;
  }

  .script-dialog-header {
    flex: 0 0 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 12px 0 14px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: rgba(234, 247, 250, 0.9);
    color: #2b4850;
    font-size: 14px;
    font-weight: 800;
  }

  .script-dialog-header button {
    min-width: 72px;
    height: 26px;
    padding: 0 12px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 7px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: default;
  }

  .script-dialog-header button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }

  .script-expanded-editor {
    flex: 1 1 auto;
    min-height: 0;
  }
</style>
