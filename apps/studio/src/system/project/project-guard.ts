import { get } from 'svelte/store'
import ConfirmDialogController from '../feedback/confirm/confirm-dialog-controller'
import ProjectSession from './project-session-store'

namespace ProjectGuard {
  export const isDirty = (): boolean => get(ProjectSession.store).isDirty

  export const confirmDiscard = async (): Promise<boolean> => {
    if (!isDirty()) return true

    return ConfirmDialogController.open({
      tone: 'danger',
      title: 'Unsaved Changes',
      message: 'There are unsaved changes. Discard them?',
      choices: [{ label: 'Discard', role: 'proceed' }],
    })
  }
}

export default ProjectGuard
