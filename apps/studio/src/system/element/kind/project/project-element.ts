import type ElementDefinition from '../../element-definition'

namespace ProjectElement {
  export type Kind = 'project'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'project',
  })

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
  } satisfies ElementDefinition.Definition<Element>
}

export default ProjectElement
