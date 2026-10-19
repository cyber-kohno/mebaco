<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type TreeNode from '@system/model/tree/tree-node'

  type Props = {
    parentNode: TreeNode.Node | null
  }

  let { parentNode }: Props = $props()

  const kindText = $derived(parentNode?.element.kind === 'component' ? 'Local store' : 'Store')
</script>

<NodeLabel tone="manager" {kindText} />
