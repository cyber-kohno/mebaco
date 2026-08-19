<script lang="ts">
  import ScriptEditorField from '../script/ScriptEditorField.svelte'

  type Props = {
    value: string
    onValueChange: (value: string) => void
    injectionSource?: string
    allowAwait?: boolean
  }

  let { value, onValueChange, injectionSource, allowAwait = false }: Props = $props()
</script>

<ScriptEditorField
  {value}
  mode="action"
  title="TypeScript Action"
  dialogLabel="Action editor"
  {injectionSource}
  {allowAwait}
  {onValueChange}
/>
