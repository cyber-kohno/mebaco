<script lang="ts">
  import NodeLabel from '../../../../NodeLabel.svelte'
  import type SlotUseElement from './slot-use-element'
  import TreeStore from '../../../../../store/tree-store'
  import DefinitionCatalog from '../../../../definition-catalog'

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
