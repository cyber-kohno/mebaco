<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type SlotElement from './slot-element'

  type Props = { element: SlotElement.Element }
  let { element }: Props = $props()
</script>

<NodeLabel tone="container" kindText="Slot" valueText={element.id} />
