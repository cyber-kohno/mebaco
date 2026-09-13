import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TypeCatalog from '../type/type-catalog'
import ConstantElement from './constant-element'
import ConstantScope from './constant-scope'

namespace ConstantsElement {
  export type Kind = 'constants'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'constants' })

  export const definition = {
    kind: 'constants',
    treeLabel: { type: 'static', kindText: 'Constants', tone: 'folder' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        action('Add constant', () => ElementDialog.openCreate(
          context.node.id,
          ConstantElement.createSchema({
            reservedNames: ConstantScope.getReservedNames(context.rootNode, context.node.id),
            referenceOptions: TypeCatalog.getReferenceOptions(context.rootNode, context.node.id),
            namedTypeOptions: TypeCatalog.getNamedTypeOptions(context.rootNode, context.node.id),
          }),
        )),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ConstantsElement
