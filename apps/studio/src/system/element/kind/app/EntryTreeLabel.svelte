<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type EntryElement from './entry-element'
  import TreeStore from '../../../store/tree-store'
  import DefinitionCatalog from '../../definition-catalog'

  type Props = {
    element: EntryElement.Element
  }

  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode
  const componentName = $derived(element.componentId == null
    ? '-'
    : DefinitionCatalog.resolveName($rootNodeStore, element.componentId, new Set(['component'])) ?? '-')
</script>

<NodeLabel tone="manager" kindText="Entry" valuePrefix="component: [" valueReferenceText={componentName} valueSuffix="]" />
