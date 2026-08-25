<script lang="ts">
  import ProjectFile from '../../project/project-file'
  import ProjectSession from '../../project/project-session-store'
  import DevelopProjectController from './develop-project-controller'
  import { developScreenStore } from './develop-screen-store'

  const projectSessionStore = ProjectSession.store
</script>

{#if $developScreenStore === 'workspace'}
  <button
    type="button"
    disabled={!$projectSessionStore.isDirty}
    onclick={ProjectFile.saveWithAlert}
  >Save</button>
  <button type="button" onclick={DevelopProjectController.close}>Close</button>
{/if}
