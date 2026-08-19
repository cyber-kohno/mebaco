<script lang="ts">
  import ActionMenuLayer from './action-menu/ActionMenuLayer.svelte'
  import ElementDialogLayer from './element-dialog/ElementDialogLayer.svelte'
  import AppKeyboardController from './keyboard/app-keyboard-controller'
  import DevelopScreen from './screen/develop/DevelopScreen.svelte'
  import PreviewDialog from './runtime/preview/PreviewDialog.svelte'
  import StartScreen from './screen/start/StartScreen.svelte'
  import AppHeader from './shell/AppHeader.svelte'
  import ToastLayer from './feedback/toast/ToastLayer.svelte'
  import ConfirmDialogLayer from './feedback/confirm/ConfirmDialogLayer.svelte'
  import { screenStore } from './store/screen-store'

  const preventNativeContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }
</script>

<svelte:window onkeydown={AppKeyboardController.handleKeydown} />

<main class="app-root" aria-label="Mebaco" oncontextmenu={preventNativeContextMenu}>
  <AppHeader />
  <div class="screen-host">
    {#if $screenStore === 'start'}
      <StartScreen />
    {:else if $screenStore === 'develop'}
      <DevelopScreen />
    {/if}
  </div>
  <ActionMenuLayer />
  <ElementDialogLayer />
  <PreviewDialog />
  <ConfirmDialogLayer />
  <ToastLayer />
</main>

<style>
  .app-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--mbc-color-app-background);
  }

  .screen-host {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }
</style>
