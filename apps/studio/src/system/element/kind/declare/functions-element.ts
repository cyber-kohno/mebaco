import type ElementDefinition from '../../element-definition'

namespace FunctionsElement {
  export type Kind = 'functions'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'functions',
  })

  export const definition = {
    kind: 'functions',
    treeLabel: {
      type: 'static',
      kindText: 'Functions',
      tone: 'folder',
    },
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default FunctionsElement
