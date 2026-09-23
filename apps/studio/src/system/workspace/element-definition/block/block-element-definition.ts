import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import RetentionActions from '@system/workspace/tree/context-menu/retention-actions'
import TreeStore from '@system/workspace/tree/state'
import type TreeNode from '@system/model/tree/tree-node'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import Block from '@system/model/block/block'

namespace BlockElementDefinition {
  export const createSchema = (): ElementEditSchema.Schema<Block.Element> => ({
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
    createPreview: () => Block.create('...'),
    getInitialValues: (element) => ({ label: element.label }),
    create: (values) => Block.create(values.label),
    update: (_element, values) => Block.create(values.label),
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

  const isInFunctionProcedure = (
    rootNode: TreeNode.Node,
    nodeId: number,
  ): boolean => (
    findPath(rootNode, nodeId)?.some(
      (node) => node.element.kind === 'function-procedure',
    ) ?? false
  )

  export const definition = {
    kind: 'block',
    treeLabel: {
      type: 'static',
      kindText: 'Block',
      tone: 'block',
      getValueText: (element: Block.Element) => element.label.length === 0
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

      if (isInFunctionProcedure(context.rootNode, context.node.id)) {
        items.push(
          FunctionActions.createAddDeclareMenu(context.node.id, context.rootNode),
          FunctionActions.createAddStatementMenu(
            context.node.id,
            context.rootNode,
          ),
          FunctionActions.createAddControlMenu(context.node.id, context.rootNode),
          FunctionActions.createAddBlockItem(context.node.id),
        )
      } else if (isInRetention(context.rootNode, context.node.id)) {
        items.push(
          RetentionActions.createAddDeclareMenu(context.node.id, context.rootNode),
          RetentionActions.createAddStatementMenu(context.node.id, context.rootNode),
          RetentionActions.createAddControlMenu(context.node.id, context.rootNode),
          ContentActions.createAddBlockItem(context.node.id),
        )
      } else {
        items.push(
          ContentActions.createAddMenu(context.node.id, context.rootNode),
          ContentActions.createAddDirectiveMenu(context.node.id, context.rootNode),
          ContentActions.createAddBlockItem(context.node.id),
        )
      }

      items.push(action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'))
      return items
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Block.Element>
}

export default BlockElementDefinition
