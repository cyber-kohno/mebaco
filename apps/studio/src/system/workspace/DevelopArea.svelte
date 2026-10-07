<script lang="ts">
  import DevelopHomeScreen from './screen/DevelopHomeScreen.svelte'
  import DevelopWorkspaceScreen from './screen/DevelopWorkspaceScreen.svelte'
  import DevelopLaunchersScreen from './screen/DevelopLaunchersScreen.svelte'
  import { developScreenStore } from './develop-screen-store'
</script>

{#if $developScreenStore === 'home'}
  <DevelopHomeScreen />
{:else if $developScreenStore === 'workspace'}
  <DevelopWorkspaceScreen />
{:else}
  <DevelopLaunchersScreen />
{/if}
