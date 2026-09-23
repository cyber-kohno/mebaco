<script lang="ts">
  import { onMount } from 'svelte'
  import ActionMenuLayer from '@system/ui/action-menu/ActionMenuLayer.svelte'
  import { ClientArea } from '@system/client/area'
  import { DevelopArea } from '@system/workspace/area'
  import { SettingArea } from '@system/application/settings/area'
  import ElementDialogLayer from '@system/workspace/element-editor/ElementDialogLayer.svelte'
  import { AppKeyboardController } from '@system/application/keyboard'
  import PreviewDialog from './runtime/preview/PreviewDialog.svelte'
  import { AppHeader, WindowTitle } from '@system/application/shell'
  import { ToastController } from '@system/ui/feedback/toast'
  import { ToastLayer } from '@system/ui/feedback/toast/layer'
  import { ConfirmDialogLayer } from '@system/ui/feedback/confirm/layer'
  import CommandConsoleLayer from './terminal/console/CommandConsoleLayer.svelte'
  import { ElementSearchLayer } from '@system/workspace/search/layer'
  import { appAreaStore } from '@system/application/navigation'
  import TreeStore from '@system/workspace/tree/state'
  import ProjectSession from './project/project-session-store'
  import ProjectGuard from './project/project-guard'
  import { ExpressionVerificationStore } from '@system/workspace/validation/state'
  import { TreeDestinationDialog } from '@system/workspace/tree/destination/layer'
  import {
    DevelopInteractionController,
  } from '@system/workspace/interaction/controller'
  import { developInteractionStore } from '@system/workspace/interaction/state'
  import { developScreenStore } from '@system/workspace/screen'
  import TauriWindow from './infra/tauri/window'
  import {
    ClientDirectLauncher,
    ClientNavigation,
    ClientPackageStore,
  } from '@system/client'
  import TauriClientLaunch from './infra/tauri/client-launch'
  import DirectRuntimeRoot from './runtime/view/DirectRuntimeRoot.svelte'

  type RootMode = 'loading' | 'studio' | 'runtime' | 'direct-error'
  let rootMode = $state<RootMode>('loading')
  let directError = $state('')
  let directInstallationId = $state<string | undefined>()

  $effect(() => {
    if (
      $developInteractionStore.type !== 'normal'
      && ($appAreaStore !== 'develop' || $developScreenStore !== 'workspace')
    ) DevelopInteractionController.cancel()
  })

  const initializeInstalledPackages = () => {
    void ClientPackageStore.initialize().then((result) => {
      if (result.warnings.length > 0) {
        ToastController.show(
          `${result.warnings.length} installed package${result.warnings.length === 1 ? '' : 's'} could not be loaded.`,
          { tone: 'warning', durationMs: 5000 },
        )
      }
    }).catch(() => {
      ToastController.show('Installed packages could not be loaded.', {
        tone: 'warning',
        durationMs: 5000,
      })
    })
  }

  const initializeRoot = async () => {
    let request
    try {
      request = await TauriClientLaunch.getStartupRequest()
    } catch {
      // The browser-only Vite preview has no Tauri command bridge.
      rootMode = 'studio'
      initializeInstalledPackages()
      return
    }

    if (request == null) {
      rootMode = 'studio'
      initializeInstalledPackages()
      return
    }

    try {
      const result = await ClientDirectLauncher.open(request)
      if (result.status === 'opened') {
        rootMode = 'runtime'
        try {
          await TauriWindow.setTitle(result.title)
        } catch {
          // Runtime remains usable if the native title cannot be changed.
        }
        return
      }
      directError = result.message
      directInstallationId = result.installationId
    } catch (error) {
      directError = error instanceof Error
        ? error.message
        : 'The application could not be started from this shortcut.'
    }
    rootMode = 'direct-error'
  }

  const openStudio = () => {
    appAreaStore.set('client')
    if (directInstallationId == null) ClientNavigation.openPackages()
    else ClientNavigation.openLaunchSetup(directInstallationId)
    rootMode = 'studio'
  }

  onMount(() => {
    void initializeRoot()
    const unsubscribeRoot = TreeStore.rootNode.subscribe((rootNode) => {
      ProjectSession.updateFromRoot(rootNode)
      ExpressionVerificationStore.syncRoot(rootNode)
    })
    const unsubscribeTitle = WindowTitle.subscribe()
    const unsubscribeInteraction = DevelopInteractionController.connectTreeLifecycle()
    let isClosing = false
    let unlistenClose: (() => void) | undefined

    try {
      void TauriWindow.onCloseRequested(async (event) => {
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

  const handleKeydown = (event: KeyboardEvent) => {
    if (rootMode === 'studio') AppKeyboardController.handleKeydown(event)
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if rootMode === 'runtime'}
  <DirectRuntimeRoot />
  <ToastLayer />
{:else if rootMode === 'direct-error'}
  <main class="direct-error" aria-label="Application launch error">
    <section>
      <h1>Application could not be opened</h1>
      <p>{directError}</p>
      <button type="button" onclick={openStudio}>
        {directInstallationId == null ? 'Open Mebaco' : 'Open Launch Setup'}
      </button>
    </section>
  </main>
{:else if rootMode === 'studio'}
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
    <TreeDestinationDialog />
    <ConfirmDialogLayer />
    <ToastLayer />
  </main>
{:else}
  <main class="startup" aria-label="Starting Mebaco"></main>
{/if}

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

  .startup,
  .direct-error {
    width: 100%;
    height: 100%;
    background: var(--mbc-color-app-background);
  }

  .direct-error {
    display: grid;
    place-items: center;
    padding: 24px;
    color: var(--mbc-color-text);
    font-size: 13px;
  }

  .direct-error section {
    width: min(520px, 100%);
    padding: 28px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 10px;
    background: white;
    box-shadow: 0 16px 40px rgba(18, 55, 64, 0.14);
  }

  .direct-error h1 {
    margin: 0;
    color: #324f56;
    font-size: 20px;
  }

  .direct-error p {
    margin: 10px 0 20px;
    color: var(--mbc-color-text-muted);
    line-height: 1.6;
  }

  .direct-error button {
    height: 34px;
    padding: 0 14px;
    border: 1px solid var(--mbc-color-primary);
    border-radius: 7px;
    background: var(--mbc-color-primary);
    color: white;
    font: inherit;
    font-weight: 700;
  }
</style>
