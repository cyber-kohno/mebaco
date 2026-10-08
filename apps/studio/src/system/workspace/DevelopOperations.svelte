<script lang="ts">
  import ProjectFile from '../project/project-file'
  import ProjectSession from '../project/project-session-store'
  import DevelopProjectController from './develop-project-controller'
  import { developScreenStore } from './develop-screen-store'
  import { translatorStore } from '@system/application/localization'

  const projectSessionStore = ProjectSession.store
</script>

{#if $developScreenStore !== 'home'}
  <button
    type="button"
    disabled={$projectSessionStore.savedFingerprint == null}
    onclick={() => developScreenStore.set($developScreenStore === 'launchers' ? 'workspace' : 'launchers')}
  >{$translatorStore($developScreenStore === 'launchers' ? 'workspace.action.tree' : 'workspace.action.launchers')}</button>
{/if}

{#if $projectSessionStore.savedFingerprint != null}
  <button
    type="button"
    disabled={!$projectSessionStore.isDirty}
    onclick={ProjectFile.saveWithAlert}
    title={$translatorStore('common.action.saveWithShortcut', { shortcut: 'Ctrl+S' })}
  >{$translatorStore('common.action.save')}</button>
  <button type="button" onclick={DevelopProjectController.close}>{$translatorStore('common.action.close')}</button>
{/if}
