<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type StyleElement from './style-element'

  type Props = {
    element: StyleElement.Element
  }

  let { element }: Props = $props()
</script>

<NodeLabel tone="master" kindText="Style" valueText={element.id} />
