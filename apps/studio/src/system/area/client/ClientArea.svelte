<script lang="ts">
  import ClientHomeScreen from './screen/ClientHomeScreen.svelte'
  import ClientLaunchSetupScreen from './screen/ClientLaunchSetupScreen.svelte'
  import { clientScreenStore } from './client-navigation-store'
</script>

{#if $clientScreenStore.type === 'packages'}
  <ClientHomeScreen />
{:else}
  <ClientLaunchSetupScreen installationId={$clientScreenStore.installationId} />
{/if}
