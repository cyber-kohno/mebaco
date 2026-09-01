<script lang="ts">
  import NodeLabel from '../../NodeLabel.svelte'
  import type DebugConfigurationElement from './debug-configuration-element'

  let { element }: { element: DebugConfigurationElement.Element } = $props()
</script>

<NodeLabel
  tone="master"
  kindText="Configuration"
  valueText={element.role === 'default' ? 'default' : element.name}
  valueTone={element.role === 'default' ? 'danger' : undefined}
/>
