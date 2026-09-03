<script lang="ts">
  import { onMount } from 'svelte'
  import { getCurrentWindow } from '@tauri-apps/api/window'
  import ActionMenuLayer from './action-menu/ActionMenuLayer.svelte'
  import ClientArea from './area/client/ClientArea.svelte'
  import DevelopArea from './area/develop/DevelopArea.svelte'
  import SettingArea from './area/setting/SettingArea.svelte'
  import ElementDialogLayer from './element-dialog/ElementDialogLayer.svelte'
  import AppKeyboardController from './keyboard/app-keyboard-controller'
  import PreviewDialog from './runtime/preview/PreviewDialog.svelte'
  import AppHeader from './shell/AppHeader.svelte'
  import ToastLayer from './feedback/toast/ToastLayer.svelte'
  import ConfirmDialogLayer from './feedback/confirm/ConfirmDialogLayer.svelte'
  import CommandConsoleLayer from './terminal/console/CommandConsoleLayer.svelte'
  import ElementSearchLayer from './element-search/ElementSearchLayer.svelte'
  import ReferenceGraphPanel from './analysis/reference/ReferenceGraphPanel.svelte'
  import { appAreaStore } from './navigation/app-area-store'
  import TreeStore from './store/tree-store'
  import ProjectSession from './project/project-session-store'
  import ProjectGuard from './project/project-guard'
  import WindowTitle from './shell/window-title'
  import ExpressionVerificationStore from './validation/expression/expression-verification-store'
  import TreeDestinationDialog from './tree/destination/TreeDestinationDialog.svelte'
  import DevelopInteractionController from './area/develop/interaction/develop-interaction-controller'
  import { developInteractionStore } from './area/develop/interaction/develop-interaction-store'
  import { developScreenStore } from './area/develop/develop-screen-store'

  $effect(() => {
    if (
      $developInteractionStore.type !== 'normal'
      && ($appAreaStore !== 'develop' || $developScreenStore !== 'workspace')
    ) DevelopInteractionController.cancel()
  })

  onMount(() => {
    const unsubscribeRoot = TreeStore.rootNode.subscribe((rootNode) => {
      ProjectSession.updateFromRoot(rootNode)
      ExpressionVerificationStore.syncRoot(rootNode)
    })
    const unsubscribeTitle = WindowTitle.subscribe()
    const unsubscribeInteraction = DevelopInteractionController.connectTreeLifecycle()
    let isClosing = false
    let unlistenClose: (() => void) | undefined

    try {
      void getCurrentWindow().onCloseRequested(async (event) => {
        if (isClosing || !ProjectGuard.isDirty()) return

        if (!await ProjectGuard.confirmDiscard()) {
          event.preventDefault()
          return
        }

        // onCloseRequested destroys the window after the handler resolves.
        // Do not call close() here, as that would recursively emit this event.
        isClosing = true
      }).then((unlisten) => {
        unlistenClose = unlisten
      }).catch(() => undefined)
    } catch {
      // The browser-only Vite preview has no Tauri window bridge.
    }

    return () => {
      unsubscribeRoot()
      unsubscribeTitle()
      unsubscribeInteraction()
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
  <div
    class="screen-host"
    role="tabpanel"
    id={`${$appAreaStore}-area-panel`}
    aria-labelledby={`${$appAreaStore}-area-tab`}
  >
    {#if $appAreaStore === 'client'}
      <ClientArea />
    {:else if $appAreaStore === 'develop'}
      <DevelopArea />
    {:else}
      <SettingArea />
    {/if}
  </div>
  <ActionMenuLayer />
  <ElementDialogLayer />
  <PreviewDialog />
  <CommandConsoleLayer />
  <ElementSearchLayer />
  <ReferenceGraphPanel />
  <TreeDestinationDialog />
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
