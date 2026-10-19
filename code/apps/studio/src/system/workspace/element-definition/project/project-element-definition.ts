import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ProjectModel from '@system/model/project/project'

namespace ProjectElementDefinition {
  export const definition = {
    kind: 'project',
    treeLabel: {
      type: 'static',
      kindText: 'Project',
      tone: 'root',
    },
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<ProjectModel.Element>
}

export default ProjectElementDefinition
