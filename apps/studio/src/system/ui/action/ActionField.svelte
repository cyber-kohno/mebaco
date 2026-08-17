<script lang="ts">
  import ScriptEditorField from '../script/ScriptEditorField.svelte'

  type Props = {
    value: string
    onValueChange: (value: string) => void
    injectionSource?: string
  }

  let { value, onValueChange, injectionSource }: Props = $props()
</script>

<ScriptEditorField
  {value}
  mode="action"
  title="TypeScript Action"
  dialogLabel="Action editor"
  {injectionSource}
  {onValueChange}
/>
