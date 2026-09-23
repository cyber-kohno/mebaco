import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import type App from '@system/model/app/app'
import AppElementDefinition from '@system/workspace/element-definition/app/app-element-definition'
import ComponentElement from '@system/model/component/component'
import { ConfirmDialogController } from '@system/ui/feedback/confirm'
import TreeNode from '@system/model/tree/tree-node'
import TreeStore from '@system/workspace/tree/state'
import { get } from 'svelte/store'
import Apps from '@system/model/project/apps'
import { translate } from '@system/application/localization'

namespace AppsElementDefinition {
  const getRootNode = () => get(TreeStore.rootNode)

  const createMainComponent = async (appNodeId: number): Promise<void> => {
    const appNode = TreeNode.findNode(getRootNode(), appNodeId)
    if (appNode?.element.kind !== 'app') return

    const shouldCreate = await ConfirmDialogController.open({
      title: translate('workspace.apps.createMain.title'),
      message: translate('workspace.apps.createMain.message'),
      choices: [
        { label: translate('common.action.no'), role: 'cancel' },
        { label: translate('common.action.yes'), role: 'proceed' },
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
        .filter((element): element is App.Element => element.kind === 'app')
        .map((element) => element.id)

      return [
        action('Add app', () => {
          ElementDialog.openCreate(
            context.node.id,
            AppElementDefinition.createSchema({ reservedNames, afterCreate: (_element, nodeId) => createMainComponent(nodeId) }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Apps.Element>
}

export default AppsElementDefinition
