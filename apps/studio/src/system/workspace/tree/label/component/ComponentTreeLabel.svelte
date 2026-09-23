<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type ComponentElement from '@system/model/component/component'

  type Props = {
    element: ComponentElement.Element
  }

  let { element }: Props = $props()
</script>

<NodeLabel tone="master" kindText={element.local === true ? 'Local Component' : 'Component'} valueText={element.id} />
