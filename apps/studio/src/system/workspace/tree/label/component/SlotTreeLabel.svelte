<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type SlotElement from '@system/model/component/slot'

  type Props = { element: SlotElement.Element }
  let { element }: Props = $props()
</script>

<NodeLabel tone="master" kindText="Slot" valueText={element.id} />
