<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type EntryElement from './entry-element'

  type Props = {
    element: EntryElement.Element
  }

  let { element }: Props = $props()

  const componentText = $derived(`component: [${element.componentId ?? '-'}]`)
</script>

<NodeLabel tone="manager" kindText="Entry" valueText={componentText} />
