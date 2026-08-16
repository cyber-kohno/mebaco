<script lang="ts">
  import MonacoScriptEditor from '../monaco/MonacoScriptEditor.svelte'
  import bodyPortal from '../portal/body-portal'

  type Props = {
    value: string
    onValueChange: (value: string) => void
    injectionSource?: string
  }

  let { value, onValueChange, injectionSource }: Props = $props()
  let isExpanded = $state(false)

  const openExpanded = () => {
    isExpanded = true
  }

  const closeExpanded = () => {
    isExpanded = false
  }
</script>

<div class="action-field">
  <div class="action-toolbar">
    <span>TypeScript Action</span>
    <button type="button" onclick={openExpanded}>Expand</button>
  </div>
  <MonacoScriptEditor
    {value}
    mode="action"
    height="120px"
    {injectionSource}
    onValueChange={onValueChange}
  />
</div>

{#if isExpanded}
  <div use:bodyPortal>
    <div class="action-scrim" role="presentation"></div>
    <section class="action-dialog" aria-label="Action editor">
      <header class="action-dialog-header">
        <div>TypeScript Action</div>
        <div class="action-dialog-actions">
          <button type="button" onclick={closeExpanded}>Back</button>
        </div>
      </header>
      <div class="action-expanded-editor">
        <MonacoScriptEditor
          {value}
          mode="action"
          height="100%"
          {injectionSource}
          onValueChange={onValueChange}
        />
      </div>
    </section>
  </div>
{/if}

<style>
  .action-field {
    display: grid;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    overflow: hidden;
  }

  .action-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 34px;
    padding: 0 8px 0 10px;
    border-bottom: 1px solid rgba(154, 203, 212, 0.66);
    background: #f4fbfc;
    color: #496970;
    font-size: 12px;
    font-weight: 700;
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

  .action-scrim {
    position: fixed;
    z-index: 1000;
    inset: 0;
    background: rgba(18, 55, 64, 0.24);
  }

  .action-dialog {
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

  .action-dialog-header {
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

  .action-dialog-actions {
    display: flex;
    gap: 8px;
  }

  .action-expanded-editor {
    flex: 1 1 auto;
    min-height: 0;
  }
</style>
