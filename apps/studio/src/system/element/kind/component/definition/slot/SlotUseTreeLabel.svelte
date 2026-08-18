<script lang="ts">
  import NodeLabel from '../../../../NodeLabel.svelte'
  import type SlotUseElement from './slot-use-element'

  type Props = { element: SlotUseElement.Element }
  let { element }: Props = $props()
</script>

<NodeLabel tone="container" kindText="Slot content" valueText={element.slotId} />
