<script lang="ts">
  import { onDestroy } from 'svelte'
  import type MonacoInjection from '../monaco/monaco-injection'
  import CompactFormulaField from './CompactFormulaField.svelte'
  import FormulaDiagnostic from './formula-diagnostic'
  import FormulaLabelState from './formula-label-state'

  type Props = {
    value: string
    ariaLabel?: string
    injectionSource?: string
    expectedType?: MonacoInjection.ExpectedType
    expectedTypeText?: string
    allowAwait?: boolean
    validationMessage?: string
    validationSeverity?: 'warning' | 'error'
    onValueChange: (value: string) => void
  }

  let {
    value,
    ariaLabel,
    injectionSource,
    expectedType,
    expectedTypeText,
    allowAwait = false,
    validationMessage,
    validationSeverity,
    onValueChange,
  }: Props = $props()

  let diagnosticMessages = $state<readonly string[] | null>(null)
  let editorActive = $state(false)
  let verificationGeneration = 0
  let destroyed = false

  const labelState = $derived(FormulaLabelState.resolve(
    value,
    validationMessage,
    diagnosticMessages,
  ))

  $effect(() => {
    const source = value
    const currentInjectionSource = injectionSource
    const currentExpectedType = expectedType
    const currentExpectedTypeText = expectedTypeText
    const currentAllowAwait = allowAwait
    const isEditorActive = editorActive
    const generation = ++verificationGeneration

    if (source.trim().length === 0) {
      diagnosticMessages = ['No formula entered.']
      return
    }
    if (isEditorActive) return

    diagnosticMessages = null
    void FormulaDiagnostic.verify({
      source,
      injectionSource: currentInjectionSource,
      expectedType: currentExpectedType,
      expectedTypeText: currentExpectedTypeText,
      allowAwait: currentAllowAwait,
    }).then((result) => {
      if (!destroyed && generation === verificationGeneration) {
        diagnosticMessages = result.messages
      }
    }).catch((error: unknown) => {
      if (!destroyed && generation === verificationGeneration) {
        diagnosticMessages = [error instanceof Error ? error.message : String(error)]
      }
    })
  })

  onDestroy(() => {
    destroyed = true
    verificationGeneration += 1
  })
</script>

<CompactFormulaField
  {value}
  {ariaLabel}
  {injectionSource}
  {expectedType}
  {expectedTypeText}
  {allowAwait}
  validationMessage={labelState.message}
  {validationSeverity}
  presentation="label"
  formulaStatus={labelState.status}
  formulaDisplayText={labelState.displayText}
  formulaPlaceholder={labelState.placeholder}
  onEditorActiveChange={(active) => {
    editorActive = active
  }}
  onDiagnosticsChange={(messages) => {
    diagnosticMessages = messages
  }}
  {onValueChange}
/>
