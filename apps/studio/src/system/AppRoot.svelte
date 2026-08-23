<script lang="ts">
  import { onMount } from 'svelte'
  import { getCurrentWindow } from '@tauri-apps/api/window'
  import ActionMenuLayer from './action-menu/ActionMenuLayer.svelte'
  import ElementDialogLayer from './element-dialog/ElementDialogLayer.svelte'
  import AppKeyboardController from './keyboard/app-keyboard-controller'
  import DevelopScreen from './screen/develop/DevelopScreen.svelte'
  import PreviewDialog from './runtime/preview/PreviewDialog.svelte'
  import StartScreen from './screen/start/StartScreen.svelte'
  import AppHeader from './shell/AppHeader.svelte'
  import ToastLayer from './feedback/toast/ToastLayer.svelte'
  import ConfirmDialogLayer from './feedback/confirm/ConfirmDialogLayer.svelte'
  import CommandConsoleLayer from './terminal/console/CommandConsoleLayer.svelte'
  import ReferenceGraphPanel from './analysis/ReferenceGraphPanel.svelte'
  import { screenStore } from './store/screen-store'
  import TreeStore from './store/tree-store'
  import ProjectSession from './project/project-session-store'
  import ProjectGuard from './project/project-guard'
  import WindowTitle from './shell/window-title'
  import ExpressionVerificationStore from './validation/expression-verification-store'

  onMount(() => {
    const unsubscribeRoot = TreeStore.rootNode.subscribe((rootNode) => {
      ProjectSession.updateFromRoot(rootNode)
      ExpressionVerificationStore.syncRoot(rootNode)
    })
    const unsubscribeTitle = WindowTitle.subscribe()
    let isClosing = false
    let unlistenClose: (() => void) | undefined

    try {
      void getCurrentWindow().onCloseRequested(async (event) => {
        if (isClosing || !ProjectGuard.isDirty()) return

        event.preventDefault()
        if (!await ProjectGuard.confirmDiscard()) return

        isClosing = true
        try {
          await getCurrentWindow().close()
        } catch (error) {
          isClosing = false
          console.error('Failed to close the Mebaco window:', error)
        }
      }).then((unlisten) => {
        unlistenClose = unlisten
      }).catch(() => undefined)
    } catch {
      // The browser-only Vite preview has no Tauri window bridge.
    }

    return () => {
      unsubscribeRoot()
      unsubscribeTitle()
      unlistenClose?.()
    }
  })

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
  <CommandConsoleLayer />
  <ReferenceGraphPanel />
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
