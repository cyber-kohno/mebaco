<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type SlotContentElement from './slot-content-element'

  type Props = { element: SlotContentElement.Element }
  let { element }: Props = $props()
</script>

<NodeLabel tone="container" kindText="Slot" valueText={element.slotId} />
