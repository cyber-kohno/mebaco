import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import type TreeNode from '@system/model/tree/tree-node'
import ImportItemsTreeLabel from '@system/workspace/tree/label/app/import/ImportItemsTreeLabel.svelte'
import TransitionImportCatalog from '@system/model/app/import/transition-import-catalog'
import type Transitions from '@system/model/app/import/transitions'

namespace TransitionsElementDefinition {
  const parseAppIds = (value: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed)
        ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))]
        : []
    } catch {
      return []
    }
  }

  export const createSchema = (
    rootNode: TreeNode.Node,
    nodeId: number,
  ): ElementEditSchema.Schema<Transitions.Element> => {
    const ownerApp = TransitionImportCatalog.findOwnerApp(rootNode, nodeId)
    const options = ownerApp == null
      ? []
      : TransitionImportCatalog.getAvailableApps(rootNode, ownerApp).map((app) => ({
          value: app.element.appId,
          label: app.element.id,
        }))
    return {
      createTitle: 'Create Transitions',
      updateTitle: 'Update Transitions',
      fields: [{
        type: 'transitionImports',
        key: 'appIds',
        label: 'Apps',
        defaultValue: '[]',
        options,
      }],
      getInitialValues: (element) => ({ appIds: JSON.stringify(element.appIds) }),
      create: (values) => ({ kind: 'transitions', appIds: parseAppIds(values.appIds) }),
      update: (element, values) => ({ ...element, appIds: parseAppIds(values.appIds) }),
    }
  }

  export const definition = {
    kind: 'transitions',
    treeLabel: { type: 'component', Component: ImportItemsTreeLabel },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [action('Modify', () => ElementDialog.openUpdate(
        context.node.id,
        context.element,
        createSchema(context.rootNode, context.node.id),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Transitions.Element>
}

export default TransitionsElementDefinition
