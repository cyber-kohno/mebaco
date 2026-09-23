<script lang="ts">
  import NodeLabel from '@system/workspace/tree/label/NodeLabel.svelte'
  import type DebugConfigurationElement from '@system/model/debug/debug-configuration'

  let { element }: { element: DebugConfigurationElement.Element } = $props()
</script>

<NodeLabel
  tone="master"
  kindText="Configuration"
  valueText={element.role === 'default' ? 'default' : element.name}
  valueTone={element.role === 'default' ? 'danger' : undefined}
/>
