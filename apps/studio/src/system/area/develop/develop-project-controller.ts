import ProjectFile from '../../project/project-file'
import ProjectGuard from '../../project/project-guard'
import { developScreenStore } from './develop-screen-store'

namespace DevelopProjectController {
  export const startEmpty = () => {
    ProjectFile.startEmpty()
    developScreenStore.set('workspace')
  }

  export const openFileWithAlert = async () => {
    if (await ProjectFile.openFileWithAlert()) {
      developScreenStore.set('workspace')
    }
  }

  export const close = async () => {
    if (!await ProjectGuard.confirmDiscard()) return

    ProjectFile.close()
    developScreenStore.set('home')
  }
}

export default DevelopProjectController
