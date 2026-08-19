<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type EntryElement from './entry-element'

  type Props = {
    element: EntryElement.Element
  }

  let { element }: Props = $props()

</script>

<NodeLabel tone="manager" kindText="Entry" valuePrefix="component: [" valueReferenceText={element.componentId ?? '-'} valueSuffix="]" />
