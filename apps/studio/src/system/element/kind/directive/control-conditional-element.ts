import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElseElement from './else-element'
import ElseIfElement from './else-if-element'
import IfElement from './if-element'
import TreeStore from '../../../store/tree-store'

namespace ControlConditionalElement {
  export type Kind = 'control-conditional'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'control-conditional' })

  export const definition = {
    kind: 'control-conditional',
    treeLabel: { type: 'static', kindText: 'Conditional', tone: 'block' },
    createInitialChildren: () => [{ element: IfElement.create() }],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const elseNode = context.node.children.find((node) => node.element.kind === 'else')
      const elseIndex = elseNode == null ? context.node.children.length : context.node.children.indexOf(elseNode)
      return [
        action('Add Else If', () => TreeStore.addChild(context.node.id, ElseIfElement.create(), elseIndex)),
        ...(elseNode == null ? [action('Use Else', () => TreeStore.addChild(context.node.id, ElseElement.create()))] : []),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default ControlConditionalElement
