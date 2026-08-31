<script lang="ts">
  import Maximize2 from '@lucide/svelte/icons/maximize-2'
  import IconButton from '../button/IconButton.svelte'
  import MonacoScriptEditor from '../monaco/MonacoScriptEditor.svelte'
  import type MonacoInjection from '../monaco/monaco-injection'
  import ScriptEditorDialog from './ScriptEditorDialog.svelte'

  type Props = {
    value: string
    title: string
    dialogLabel: string
    mode: MonacoInjection.Mode
    onValueChange: (value: string) => void
    injectionSource?: string
    expectedType?: MonacoInjection.ExpectedType
    expectedTypeText?: string
    allowAwait?: boolean
    functionParameters?: readonly MonacoInjection.FunctionParameter[]
    onDiagnosticsChange?: (messages: string[]) => void
  }

  let {
    value,
    title,
    dialogLabel,
    mode,
    onValueChange,
    injectionSource,
    expectedType,
    expectedTypeText,
    allowAwait = false,
    functionParameters = [],
    onDiagnosticsChange,
  }: Props = $props()

  let isExpanded = $state(false)
</script>

<div class="script-editor-field">
  <div class="script-toolbar">
    <span>{title}</span>
    <IconButton
      label={`Expand ${title}`}
      onclick={() => {
        isExpanded = true
      }}
    >
      {#snippet icon()}
        <Maximize2 size={15} strokeWidth={2} />
      {/snippet}
    </IconButton>
  </div>
  <MonacoScriptEditor
    {value}
    {mode}
    height="120px"
    {injectionSource}
    {expectedType}
    {expectedTypeText}
    {allowAwait}
    {functionParameters}
    {onDiagnosticsChange}
    onValueChange={onValueChange}
  />
</div>

{#if isExpanded}
  <ScriptEditorDialog
    {value}
    {title}
    {dialogLabel}
    {mode}
    {injectionSource}
    {expectedType}
    {expectedTypeText}
    {allowAwait}
    {functionParameters}
    {onDiagnosticsChange}
    {onValueChange}
    onBack={() => {
      isExpanded = false
    }}
  />
{/if}

<style>
  .script-editor-field {
    display: grid;
    gap: 0;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    overflow: hidden;
  }

  .script-toolbar {
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

</style>
