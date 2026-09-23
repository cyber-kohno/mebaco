<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type Entry from '@system/model/app/entry'
  import TreeStore from '@system/workspace/tree/state'
  import DefinitionCatalog from '@system/model/element/definition-catalog'

  type Props = {
    element: Entry.Element
  }

  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode
  const componentName = $derived(element.componentId == null
    ? '-'
    : DefinitionCatalog.resolveName($rootNodeStore, element.componentId, new Set(['component'])) ?? '-')
</script>

<NodeLabel tone="manager" kindText="Entry" valuePrefix="component: [" valueReferenceText={componentName} valueSuffix="]" />
