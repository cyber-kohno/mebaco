<script lang="ts">
  import { translatorStore } from '@system/application/localization'
  import ClientNavigation, { clientScreenStore } from './client-navigation-store'
</script>

{#if $clientScreenStore.type === 'launch-setup'}
  <button type="button" onclick={ClientNavigation.openPackages}>← {$translatorStore('common.action.back')}</button>
{/if}
