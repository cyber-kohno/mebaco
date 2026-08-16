import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import RetentionActions from '../../retention-actions'
import TreeStore from '../../../store/tree-store'
import type TreeNode from '../../../tree/tree-node'

namespace BlockElement {
  export type Kind = 'block'

  export type Element = {
    kind: Kind
    label: string
  }

  export const create = (label = ''): Element => ({
    kind: 'block',
    label,
  })

  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Block',
    updateTitle: 'Update Block',
    fields: [
      {
        type: 'text',
        key: 'label',
        label: 'Label',
        width: 'id',
        maxLength: 64,
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({ label: element.label }),
    create: (values) => create(values.label),
    update: (_element, values) => create(values.label),
  })

  const findPath = (
    node: TreeNode.Node,
    targetNodeId: number,
    path: TreeNode.Node[] = [],
  ): TreeNode.Node[] | null => {
    const nextPath = [...path, node]
    if (node.id === targetNodeId) return nextPath
    for (const child of node.children) {
      const found = findPath(child, targetNodeId, nextPath)
      if (found != null) return found
    }
    return null
  }

  const isInRetention = (
    rootNode: TreeNode.Node,
    nodeId: number,
  ): boolean => (
    findPath(rootNode, nodeId)?.some((node) => node.element.kind === 'retention') ?? false
  )

  export const definition = {
    kind: 'block',
    treeLabel: {
      type: 'static',
      kindText: 'Block',
      tone: 'block',
      getValueText: (element: Element) => element.label.length === 0
        ? undefined
        : element.label,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const items: ActionMenuState.Item[] = [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema(),
        )),
      ]

      if (isInRetention(context.rootNode, context.node.id)) {
        items.push(
          RetentionActions.createAddDeclareMenu(context.node.id, context.rootNode),
          RetentionActions.createAddActionItem(context.node.id),
          ContentActions.createAddBlockItem(context.node.id),
        )
      } else {
        items.push(
          ContentActions.createAddMenu(context.node.id, context.rootNode),
          ContentActions.createAddDirectiveMenu(context.node.id),
          ContentActions.createAddBlockItem(context.node.id),
        )
      }

      items.push(action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'))
      return items
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default BlockElement
