<script lang="ts">
  import SquareFunction from '@lucide/svelte/icons/square-function'
  import IconButton from '../button/IconButton.svelte'

  type Mode = 'literal' | 'formula'

  type Props = {
    mode: Mode
    onModeChange: (mode: Mode) => void
  }

  let { mode, onModeChange }: Props = $props()
</script>

<IconButton
  label={mode === 'formula' ? 'Use literal value' : 'Use formula'}
  pressed={mode === 'formula'}
  onclick={() => onModeChange(mode === 'formula' ? 'literal' : 'formula')}
>
  {#snippet icon()}
    <SquareFunction size={15} strokeWidth={2} />
  {/snippet}
</IconButton>
