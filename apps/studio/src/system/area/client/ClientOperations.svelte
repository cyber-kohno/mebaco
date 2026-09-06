<script lang="ts">
  import ClientNavigation, { clientScreenStore } from './client-navigation-store'
</script>

{#if $clientScreenStore.type === 'launch-setup'}
  <button type="button" onclick={ClientNavigation.openPackages}>← Back</button>
{/if}
