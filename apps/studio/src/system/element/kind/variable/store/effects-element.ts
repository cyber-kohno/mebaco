import type ElementDefinition from '../../../element-definition'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'

namespace EffectsElement {
  export type Kind = 'effects'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'effects' })

  export const definition = {
    kind: 'effects',
    treeLabel: {
      type: 'static',
      kindText: 'Effects',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const hasMount = context.node.children.some((child) => (
        child.element.kind === 'effect' && child.element.trigger === 'mount'
      ))
      return [
        action('Add effect', () => {
          void import('./effect-element').then(({ default: EffectElement }) => {
            ElementDialog.openCreate(
              context.node.id,
              EffectElement.createSchema({ allowMount: !hasMount }),
            )
          })
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default EffectsElement
