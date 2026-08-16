<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type ComponentElement from './component-element'

  type Props = {
    element: ComponentElement.Element
  }

  let { element }: Props = $props()
</script>

<NodeLabel tone="master" kindText="Component" valueText={element.id} />
