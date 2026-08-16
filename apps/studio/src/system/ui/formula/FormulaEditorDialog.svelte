<script lang="ts">
  import MonacoScriptEditor from '../monaco/MonacoScriptEditor.svelte'
  import bodyPortal from '../portal/body-portal'

  type Props = {
    value: string
    injectionSource?: string
    expectedType?: 'string' | 'number' | 'boolean' | 'array'
    expectedTypeText?: string
    onDiagnosticsChange?: (messages: string[]) => void
    onValueChange: (value: string) => void
    onBack: () => void
  }

  let {
    value,
    injectionSource,
    expectedType,
    expectedTypeText,
    onDiagnosticsChange,
    onValueChange,
    onBack,
  }: Props = $props()
</script>

<div use:bodyPortal>
  <div class="formula-scrim" role="presentation"></div>
  <section class="formula-dialog" aria-label="Formula editor">
    <header class="formula-dialog-header">
      <div>TypeScript Expression</div>
      <button type="button" onclick={onBack}>Back</button>
    </header>
    <div class="formula-expanded-editor">
      <MonacoScriptEditor
        {value}
        mode="expression"
        height="100%"
        {injectionSource}
        {expectedType}
        {expectedTypeText}
        {onDiagnosticsChange}
        onValueChange={onValueChange}
      />
    </div>
  </section>
</div>

<style>
  .formula-scrim {
    position: fixed;
    z-index: 1000;
    inset: 0;
    background: rgba(18, 55, 64, 0.24);
  }

  .formula-dialog {
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

  .formula-dialog-header {
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

  button {
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

  button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }

  .formula-expanded-editor {
    flex: 1 1 auto;
    min-height: 0;
  }
</style>
