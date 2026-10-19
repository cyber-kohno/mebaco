<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type SlotContentElement from '@system/model/component/slot-content'
  import TreeStore from '@system/workspace/tree/state'
  import DefinitionCatalog from '@system/model/element/definition-catalog'

  type Props = { element: SlotContentElement.Element }
  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode
  const slotName = $derived(DefinitionCatalog.resolveName(
    $rootNodeStore,
    element.slotId,
    new Set(['slot']),
  ) ?? '-')
</script>

<NodeLabel tone="container" kindText="Slot" valueReferenceText={slotName} />
