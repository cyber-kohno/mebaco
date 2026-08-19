<script lang="ts">
  import type MonacoInjection from '../monaco/monaco-injection'
  import ScriptEditorField from '../script/ScriptEditorField.svelte'

  type Props = {
    value: string
    onValueChange: (value: string) => void
    injectionSource?: string
    expectedType?: MonacoInjection.ExpectedType
    expectedTypeText?: string
    allowAwait?: boolean
  }

  let {
    value,
    onValueChange,
    injectionSource,
    expectedType,
    expectedTypeText,
    allowAwait = false,
  }: Props = $props()
</script>

<ScriptEditorField
  {value}
  mode="expression"
  title="TypeScript Expression"
  dialogLabel="Formula editor"
  {injectionSource}
  {expectedType}
  {expectedTypeText}
  {allowAwait}
  {onValueChange}
/>
