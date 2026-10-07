<script lang="ts">
  import ProjectFile from '../project/project-file'
  import ProjectSession from '../project/project-session-store'
  import DevelopProjectController from './develop-project-controller'
  import { developScreenStore } from './develop-screen-store'
  import { translatorStore } from '@system/application/localization'

  const projectSessionStore = ProjectSession.store
</script>

<button
  type="button"
  disabled={$projectSessionStore.savedFingerprint == null}
  aria-pressed={$developScreenStore === 'workspace'}
  onclick={() => developScreenStore.set('workspace')}
>{$translatorStore('workspace.action.tree')}</button>
<button
  type="button"
  disabled={$projectSessionStore.savedFingerprint == null}
  aria-pressed={$developScreenStore === 'launchers'}
  onclick={() => developScreenStore.set('launchers')}
>{$translatorStore('workspace.action.launchers')}</button>

{#if $projectSessionStore.savedFingerprint != null}
  <button
    type="button"
    disabled={!$projectSessionStore.isDirty}
    onclick={ProjectFile.saveWithAlert}
    title={$translatorStore('common.action.saveWithShortcut', { shortcut: 'Ctrl+S' })}
  >{$translatorStore('common.action.save')}</button>
  <button type="button" onclick={DevelopProjectController.close}>{$translatorStore('common.action.close')}</button>
{/if}
