<script lang="ts">
  import type MonacoInjection from '../monaco/monaco-injection'
  import ScriptEditorField from './ScriptEditorField.svelte'

  type Props = {
    value: string
    onValueChange: (value: string) => void
    injectionSource?: string
    expectedTypeText?: string
    allowAwait?: boolean
    functionParameters?: readonly MonacoInjection.FunctionParameter[]
  }

  let {
    value,
    onValueChange,
    injectionSource,
    expectedTypeText,
    allowAwait = false,
    functionParameters = [],
  }: Props = $props()
</script>

<ScriptEditorField
  {value}
  mode="code"
  title="TypeScript Code"
  dialogLabel="Function code editor"
  {injectionSource}
  {expectedTypeText}
  {allowAwait}
  {functionParameters}
  {onValueChange}
/>
