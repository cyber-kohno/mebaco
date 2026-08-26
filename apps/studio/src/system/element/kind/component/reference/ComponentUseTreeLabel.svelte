<script lang="ts">
  import NodeLabel from '../../../NodeLabel.svelte'
  import ComponentUseElement from './component-use-element'
  import type TreeNode from '../../../../tree/tree-node'

  type Props = {
    element: ComponentUseElement.Element
    rootNode?: TreeNode.Node
  }

  let { element, rootNode }: Props = $props()

  const componentName = $derived.by(() => {
    if (rootNode == null || element.componentId == null) return '-'
    const findUseNode = (node: TreeNode.Node): TreeNode.Node | null => {
      if (node.element === element) return node
      for (const child of node.children) {
        const found = findUseNode(child)
        if (found != null) return found
      }
      return null
    }
    const useNode = findUseNode(rootNode)
    if (useNode == null) return '-'
    const componentNode = ComponentUseElement.findComponentNode(rootNode, useNode.id, element.componentId)
    return componentNode?.element.kind === 'component' ? componentNode.element.id : '-'
  })

  const tone = $derived.by(() => {
    if (rootNode == null || element.componentId == null) return 'item'
    const findUseNode = (node: TreeNode.Node): TreeNode.Node | null => {
      if (node.element === element) return node
      for (const child of node.children) {
        const found = findUseNode(child)
        if (found != null) return found
      }
      return null
    }
    const useNode = findUseNode(rootNode)
    if (useNode == null) return 'item'
    const componentNode = ComponentUseElement.findComponentNode(rootNode, useNode.id, element.componentId)
    const slotsNode = componentNode?.children.find((child) => child.element.kind === 'slots')
    return slotsNode?.children.some((child) => child.element.kind === 'slot') ? 'container' : 'item'
  })
</script>

<NodeLabel {tone} kindText="Component" valuePrefix="component: [" valueReferenceText={componentName} valueSuffix="]" />
