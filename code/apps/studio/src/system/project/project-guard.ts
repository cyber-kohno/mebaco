import { get } from 'svelte/store'
import { translate } from '@system/application/localization'
import { ConfirmDialogController } from '@system/ui/feedback/confirm'
import ProjectSession from './project-session-store'

namespace ProjectGuard {
  export const isDirty = (): boolean => get(ProjectSession.store).isDirty

  export const confirmDiscard = async (): Promise<boolean> => {
    if (!isDirty()) return true

    return ConfirmDialogController.open({
      tone: 'danger',
      title: translate('project.unsavedChanges.title'),
      message: translate('project.unsavedChanges.message'),
      choices: [{
        label: translate('project.unsavedChanges.action.discard'),
        role: 'proceed',
      }],
    })
  }
}

export default ProjectGuard
