<script lang="ts">
  import DevelopHomeScreen from './screen/DevelopHomeScreen.svelte'
  import DevelopWorkspaceScreen from './screen/DevelopWorkspaceScreen.svelte'
  import { developScreenStore } from './develop-screen-store'
</script>

{#if $developScreenStore === 'home'}
  <DevelopHomeScreen />
{:else}
  <DevelopWorkspaceScreen />
{/if}
