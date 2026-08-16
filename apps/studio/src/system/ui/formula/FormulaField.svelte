<script lang="ts">
  import MonacoScriptEditor from '../monaco/MonacoScriptEditor.svelte'
  import FormulaEditorDialog from './FormulaEditorDialog.svelte'

  type Props = {
    value: string
    onValueChange: (value: string) => void
    injectionSource?: string
    expectedType?: 'string' | 'number' | 'boolean' | 'array'
    expectedTypeText?: string
  }

  let { value, onValueChange, injectionSource, expectedType, expectedTypeText }: Props = $props()
  let isExpanded = $state(false)

  const openExpanded = () => {
    isExpanded = true
  }

  const closeExpanded = () => {
    isExpanded = false
  }
</script>

<div class="formula-field">
  <div class="formula-toolbar">
    <span>TypeScript Expression</span>
    <button type="button" onclick={openExpanded}>Expand</button>
  </div>
  <MonacoScriptEditor
    {value}
    mode="expression"
    height="120px"
    {injectionSource}
    {expectedType}
    {expectedTypeText}
    onValueChange={onValueChange}
  />
</div>

{#if isExpanded}
  <FormulaEditorDialog
    {value}
    {injectionSource}
    {expectedType}
    {expectedTypeText}
    {onValueChange}
    onBack={closeExpanded}
  />
{/if}

<style>
  .formula-field {
    display: grid;
    gap: 0;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    overflow: hidden;
  }

  .formula-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
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

</style>
