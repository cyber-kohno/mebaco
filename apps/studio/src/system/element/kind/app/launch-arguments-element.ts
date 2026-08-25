import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import LaunchArgumentElement from './launch-argument-element'
import TypeCatalog from '../type/type-catalog'

namespace LaunchArgumentsElement {
  export type Kind = 'launch-arguments'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'launch-arguments' })
  export const definition = {
    kind: 'launch-arguments', treeLabel: { type: 'static', kindText: 'Arguments', tone: 'folder' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children.map((n) => n.element).filter((e): e is LaunchArgumentElement.Element => e.kind === 'launch-argument').map((e) => e.id)
      return [action('Add Argument', () => ElementDialog.openCreate(context.node.id, LaunchArgumentElement.createSchema({ reservedNames, referenceOptions: TypeCatalog.getReferenceOptions(context.rootNode, context.node.id), namedTypeOptions: TypeCatalog.getCommonNamedTypeOptions(context.rootNode) })))]
    }, childSlots: [], canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}
export default LaunchArgumentsElement
