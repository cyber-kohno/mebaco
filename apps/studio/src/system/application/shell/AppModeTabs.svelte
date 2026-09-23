<script lang="ts">
  import { get } from 'svelte/store'
  import { appAreaStore, type AppArea } from '@system/application/navigation'
  import {
    translate,
    translatorStore,
    type MessageKey,
  } from '@system/application/localization'
  import { settingNavigationGuardStore } from '@system/application/settings'
  import { ConfirmDialogController } from '@system/ui/feedback/confirm'

  const areas: readonly { id: AppArea; labelKey: MessageKey }[] = [
    { id: 'client', labelKey: 'shell.area.client' },
    { id: 'develop', labelKey: 'shell.area.develop' },
    { id: 'setting', labelKey: 'shell.area.setting' },
  ]

  const selectArea = async (area: AppArea) => {
    if (get(appAreaStore) === area) return

    if (get(appAreaStore) === 'setting') {
      const guard = get(settingNavigationGuardStore)
      if (guard?.hasChanges() === true) {
        const discard = await ConfirmDialogController.open({
          tone: 'warning',
          title: translate('settings.unsavedChanges.title'),
          message: translate('settings.unsavedChanges.message'),
          choices: [
            { label: translate('common.action.keepEditing'), role: 'cancel' },
            { label: translate('common.action.discard'), role: 'proceed' },
          ],
        })
        if (!discard) return
        guard.discard()
      }
    }

    appAreaStore.set(area)
  }
</script>

<nav class="mode-navigation" aria-label={$translatorStore('shell.tabs.label')}>
  <div class="mode-tabs" role="tablist">
    {#each areas as area}
      <button
        type="button"
        role="tab"
        id={`${area.id}-area-tab`}
        class:active={$appAreaStore === area.id}
        aria-selected={$appAreaStore === area.id}
        aria-controls={`${area.id}-area-panel`}
        onclick={() => { void selectArea(area.id) }}
      >{$translatorStore(area.labelKey)}</button>
    {/each}
  </div>
</nav>

<style>
  .mode-navigation,
  .mode-tabs {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .mode-tabs {
    gap: 2px;
  }

  button {
    min-width: 92px;
    height: 100%;
    padding: 0 18px;
    border-bottom: 3px solid transparent;
    background: transparent;
    color: var(--mbc-color-text-muted);
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    cursor: default;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease;
  }

  button:hover {
    background: var(--mbc-color-primary-soft);
    color: #236f7a;
  }

  button.active {
    border-bottom-color: var(--mbc-color-primary);
    background: rgba(221, 245, 248, 0.72);
    color: #1f6270;
  }

  button:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: -4px;
  }
</style>
