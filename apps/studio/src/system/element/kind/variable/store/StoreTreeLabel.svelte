<script lang="ts">
  import NodeLabel from '../../../NodeLabel.svelte'
  import type TreeNode from '../../../../tree/tree-node'

  type Props = {
    parentNode: TreeNode.Node | null
  }

  let { parentNode }: Props = $props()

  const kindText = $derived(parentNode?.element.kind === 'component' ? 'Local store' : 'Store')
</script>

<NodeLabel tone="manager" {kindText} />
