import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElseElement from './else-element'
import ElseIfElement from './else-if-element'
import IfElement from './if-element'
import TreeStore from '../../../store/tree-store'

namespace ConditionalElement {
  export type Kind = 'conditional'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'conditional',
  })

  export const definition = {
    kind: 'conditional',
    treeLabel: {
      type: 'static',
      kindText: 'Conditional',
      tone: 'block',
    },
    createInitialChildren: () => [
      {
        element: IfElement.create(),
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
        action('Add Else If', () => {
          TreeStore.addChild(
            context.node.id,
            ElseIfElement.create(),
            elseIndex,
          )
        }),
      ]

      if (elseNode == null) {
        items.push(action('Use Else', () => {
          TreeStore.addChild(context.node.id, ElseElement.create())
        }))
      }

      return items
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ConditionalElement
