<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type SlotUseElement from '@system/model/component/slot-use'
  import TreeStore from '@system/workspace/tree/state'
  import DefinitionCatalog from '@system/model/element/definition-catalog'

  type Props = { element: SlotUseElement.Element }
  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode
  const slotName = $derived(DefinitionCatalog.resolveName(
    $rootNodeStore,
    element.slotId,
    new Set(['slot']),
  ) ?? '-')
</script>

<NodeLabel tone="container" kindText="Slot content" valueReferenceText={slotName} />
