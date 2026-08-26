import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import AppElement from '../app/app-element'
import ComponentElement from '../component/definition/component-element'
import ConfirmDialogController from '../../../feedback/confirm/confirm-dialog-controller'
import TreeNode from '../../../tree/tree-node'
import TreeStore from '../../../store/tree-store'
import { get } from 'svelte/store'

namespace AppsElement {
  export type Kind = 'apps'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'apps',
  })

  const getRootNode = () => get(TreeStore.rootNode)

  const createMainComponent = async (appNodeId: number): Promise<void> => {
    const appNode = TreeNode.findNode(getRootNode(), appNodeId)
    if (appNode?.element.kind !== 'app') return

    const shouldCreate = await ConfirmDialogController.open({
      title: 'Create Main Component',
      message: 'Would you like to generate a Main component automatically?',
      choices: [
        { label: 'Yes', role: 'proceed' },
        { label: 'No', role: 'cancel' },
      ],
    })
    if (!shouldCreate) return

    const declaresNode = appNode.children.find((node) => node.element.kind === 'declares')
    const componentsNode = declaresNode?.children.find((node) => node.element.kind === 'components')
    const entryNode = appNode.children.find((node) => node.element.kind === 'entry')
    if (componentsNode == null || entryNode?.element.kind !== 'entry') return

    const existingMain = componentsNode.children.find((node) => (
      node.element.kind === 'component' && node.element.id === 'Main'
    ))
    const componentId = existingMain?.element.kind === 'component'
      ? existingMain.element.componentId
      : ComponentElement.create('Main').componentId
    if (existingMain == null) {
      TreeStore.addChild(
        componentsNode.id,
        ComponentElement.create('Main', componentId),
      )
    }

    TreeStore.updateElement(entryNode.id, {
      ...entryNode.element,
      componentId,
      propBindings: [],
    })
  }

  export const definition = {
    kind: 'apps',
    treeLabel: {
      type: 'static',
      kindText: 'Apps',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children
        .map((node) => node.element)
        .filter((element): element is AppElement.Element => element.kind === 'app')
        .map((element) => element.id)

      return [
        action('Add App', () => {
          ElementDialog.openCreate(
            context.node.id,
            AppElement.createSchema({ reservedNames, afterCreate: (_element, nodeId) => createMainComponent(nodeId) }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default AppsElement
