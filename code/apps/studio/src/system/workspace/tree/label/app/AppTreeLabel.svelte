<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type App from '@system/model/app/app'

  type Props = {
    element: App.Element
  }

  let { element }: Props = $props()
</script>

<NodeLabel tone="master" kindText="App" valueText={element.id} />
