<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type TransitionElement from './transition-element'
  import TreeStore from '../../../store/tree-store'
  import DefinitionCatalog from '../../definition-catalog'

  let { element }: { element: TransitionElement.Element } = $props()
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
