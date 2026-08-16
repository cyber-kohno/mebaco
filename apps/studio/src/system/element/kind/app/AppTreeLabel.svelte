<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type AppElement from './app-element'

  type Props = {
    element: AppElement.Element
  }

  let { element }: Props = $props()
</script>

<NodeLabel tone="master" kindText="App" valueText={element.id} />
