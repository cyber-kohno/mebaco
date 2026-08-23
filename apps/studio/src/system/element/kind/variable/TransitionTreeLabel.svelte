<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type TransitionElement from './transition-element'

  let { element }: { element: TransitionElement.Element } = $props()
</script>

<NodeLabel
  tone="item"
  kindText="Transition"
  valuePrefix="app: ["
  valueReferenceText={element.appId ?? '-'}
  valueSuffix="]"
/>
