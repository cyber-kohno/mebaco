<script lang="ts">
  import NodeLabel from '../../../../NodeLabel.svelte'
  import type SlotContentElement from './slot-content-element'
  import TreeStore from '../../../../../store/tree-store'
  import DefinitionCatalog from '../../../../definition-catalog'

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
