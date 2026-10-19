import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import Effects from '@system/model/variable/effects'

namespace EffectsElementDefinition {
  export const definition = {
    kind: 'effects',
    treeLabel: {
      type: 'static',
      kindText: 'Effects',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        action('Add effect', () => {
          void import('./effect-element-definition').then(({ default: EffectElementDefinition }) => {
            ElementDialog.openCreate(
              context.node.id,
              EffectElementDefinition.createSchema(),
            )
          })
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Effects.Element>
}

export default EffectsElementDefinition
