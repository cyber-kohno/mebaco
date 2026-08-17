<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type ComponentUseElement from './component-use-element'

  type Props = {
    element: ComponentUseElement.Element
  }

  let { element }: Props = $props()

  const componentText = $derived(`component: [${element.componentId ?? '-'}]`)
</script>

<NodeLabel tone="item" kindText="Component" valueText={componentText} />
