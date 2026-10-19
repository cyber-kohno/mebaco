import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElseDirective from '@system/model/directive/else'
import ElseIfDirective from '@system/model/directive/else-if'
import IfDirective from '@system/model/directive/if'
import ControlConditional from '@system/model/directive/control-conditional'
import TreeStore from '@system/workspace/tree/state'

namespace ControlConditionalElementDefinition {
  export const definition = {
    kind: 'control-conditional',
    treeLabel: { type: 'static', kindText: 'Conditional', tone: 'block' },
    createInitialChildren: () => [{ element: IfDirective.create() }],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const elseNode = context.node.children.find((node) => node.element.kind === 'else')
      const elseIndex = elseNode == null ? context.node.children.length : context.node.children.indexOf(elseNode)
      return [
        action('Add else if', () => TreeStore.addChild(context.node.id, ElseIfDirective.create(), elseIndex)),
        ...(elseNode == null ? [action('Use else', () => TreeStore.addChild(context.node.id, ElseDirective.create()))] : []),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<ControlConditional.Element>
}

export default ControlConditionalElementDefinition
