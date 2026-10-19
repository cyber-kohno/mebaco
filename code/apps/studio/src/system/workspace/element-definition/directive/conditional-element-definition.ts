import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElseDirective from '@system/model/directive/else'
import ElseIfDirective from '@system/model/directive/else-if'
import IfDirective from '@system/model/directive/if'
import Conditional from '@system/model/directive/conditional'
import TreeStore from '@system/workspace/tree/state'

namespace ConditionalElementDefinition {
  export const definition = {
    kind: 'conditional',
    treeLabel: {
      type: 'static',
      kindText: 'Conditional',
      tone: 'block',
    },
    createInitialChildren: () => [
      {
        element: IfDirective.create(),
      },
    ],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const elseNode = context.node.children.find((node) => (
        node.element.kind === 'else'
      ))
      const elseIndex = elseNode == null
        ? context.node.children.length
        : context.node.children.indexOf(elseNode)

      const items: ActionMenuState.Item[] = [
        action('Add else if', () => {
          TreeStore.addChild(
            context.node.id,
            ElseIfDirective.create(),
            elseIndex,
          )
        }),
      ]

      if (elseNode == null) {
        items.push(action('Use else', () => {
          TreeStore.addChild(context.node.id, ElseDirective.create())
        }))
      }

      items.push(action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'))
      return items
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Conditional.Element>
}

export default ConditionalElementDefinition

