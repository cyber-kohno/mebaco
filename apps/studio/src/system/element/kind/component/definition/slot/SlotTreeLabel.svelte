<script lang="ts">
  import NodeLabel from '../../../../NodeLabel.svelte'
  import type SlotElement from './slot-element'

  type Props = { element: SlotElement.Element }
  let { element }: Props = $props()
</script>

<NodeLabel tone="master" kindText="Slot" valueText={element.id} />
