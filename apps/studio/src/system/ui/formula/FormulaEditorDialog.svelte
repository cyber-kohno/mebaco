<script lang="ts">
  import type MonacoInjection from '../monaco/monaco-injection'
  import ScriptEditorDialog from '../script/ScriptEditorDialog.svelte'

  type Props = {
    value: string
    injectionSource?: string
    expectedType?: MonacoInjection.ExpectedType
    expectedTypeText?: string
    allowAwait?: boolean
    onDiagnosticsChange?: (messages: string[]) => void
    onValueChange: (value: string) => void
    onBack: () => void
  }

  let {
    value,
    injectionSource,
    expectedType,
    expectedTypeText,
    allowAwait = false,
    onDiagnosticsChange,
    onValueChange,
    onBack,
  }: Props = $props()
</script>

<ScriptEditorDialog
  {value}
  mode="expression"
  title="TypeScript Expression"
  dialogLabel="Formula editor"
  {injectionSource}
  {expectedType}
  {expectedTypeText}
  {allowAwait}
  {onDiagnosticsChange}
  {onValueChange}
  {onBack}
/>
