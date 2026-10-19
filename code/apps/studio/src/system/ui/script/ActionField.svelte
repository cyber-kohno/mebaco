<script lang="ts">
  import ScriptEditorField from './ScriptEditorField.svelte'

  type Props = {
    value: string
    onValueChange: (value: string) => void
    injectionSource?: string
    allowAwait?: boolean
    fillAvailable?: boolean
  }

  let {
    value,
    onValueChange,
    injectionSource,
    allowAwait = false,
    fillAvailable = false,
  }: Props = $props()
</script>

<ScriptEditorField
  {value}
  mode="action"
  title="TypeScript Action"
  dialogLabel="Action editor"
  {injectionSource}
  {allowAwait}
  {fillAvailable}
  {onValueChange}
/>
