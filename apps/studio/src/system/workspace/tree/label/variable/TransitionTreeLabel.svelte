<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type Transition from '@system/model/variable/transition'
  import TreeStore from '@system/workspace/tree/state'
  import DefinitionCatalog from '@system/model/element/definition-catalog'

  let { element }: { element: Transition.Element } = $props()
  const rootNodeStore = TreeStore.rootNode
  const appName = $derived(element.appId == null
    ? '-'
    : DefinitionCatalog.resolveName($rootNodeStore, element.appId, new Set(['app'])) ?? '-')
</script>

<NodeLabel
  tone="item"
  kindText="Transition"
  valuePrefix="app: ["
  valueReferenceText={appName}
  valueSuffix="]"
/>
