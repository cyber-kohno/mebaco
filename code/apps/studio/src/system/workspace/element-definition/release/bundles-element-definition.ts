import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import BundleElementDefinition from './bundle-element-definition'
import Bundles from '@system/model/release/bundles'

namespace BundlesElementDefinition {
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
        BundleElementDefinition.createSchema(context.rootNode, reservedNames),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Bundles.Element>
}

export default BundlesElementDefinition
