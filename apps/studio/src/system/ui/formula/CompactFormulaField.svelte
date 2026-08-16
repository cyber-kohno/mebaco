<script lang="ts">
  import Maximize2 from '@lucide/svelte/icons/maximize-2'
  import IconButton from '../button/IconButton.svelte'
  import FormulaEditorDialog from './FormulaEditorDialog.svelte'

  type Props = {
    value: string
    ariaLabel?: string
    injectionSource?: string
    expectedType?: 'string' | 'number' | 'boolean'
    validationMessage?: string
    validationSeverity?: 'warning' | 'error'
    onValueChange: (value: string) => void
  }

  let {
    value,
    ariaLabel = 'Formula',
    injectionSource,
    expectedType,
    validationMessage,
    validationSeverity,
    onValueChange,
  }: Props = $props()

  let isExpanded = $state(false)
  let diagnosticMessages = $state<string[]>([])
  const effectiveValidationMessage = $derived(
    validationMessage ?? diagnosticMessages[0],
  )
</script>

<div class="compact-formula-field">
  <input
    type="text"
    {value}
    aria-label={ariaLabel}
    aria-invalid={effectiveValidationMessage == null ? undefined : true}
    data-validation-severity={effectiveValidationMessage == null ? undefined : validationSeverity ?? 'error'}
    title={effectiveValidationMessage}
    oninput={(event) => {
      diagnosticMessages = []
      onValueChange(event.currentTarget.value)
    }}
  />
  <IconButton
    label={`Open ${ariaLabel} editor`}
    onclick={() => {
      isExpanded = true
    }}
  >
    {#snippet icon()}
      <Maximize2 size={15} strokeWidth={2} />
    {/snippet}
  </IconButton>
</div>

{#if isExpanded}
  <FormulaEditorDialog
    {value}
    {injectionSource}
    {expectedType}
    {onValueChange}
    onDiagnosticsChange={(messages) => {
      diagnosticMessages = messages
    }}
    onBack={() => {
      isExpanded = false
    }}
  />
{/if}

<style>
  .compact-formula-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 28px;
    gap: var(--mbc-form-control-gap);
    min-width: 0;
  }

  input {
    width: 100%;
    height: 32px;
    padding: 0 9px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

</style>
