import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import BundleElement from './bundle-element'

namespace BundlesElement {
  export type Kind = 'bundles'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'bundles' })

  export const definition = {
    kind: 'bundles',
    treeLabel: { type: 'static', kindText: 'Bundles', tone: 'folder' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children.flatMap((child) => (
        child.element.kind === 'bundle' ? [child.element.id] : []
      ))
      return [action('Add bundle', () => ElementDialog.openCreate(
        context.node.id,
        BundleElement.createSchema(context.rootNode, reservedNames),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default BundlesElement
