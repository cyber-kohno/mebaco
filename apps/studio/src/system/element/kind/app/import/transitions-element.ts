import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import type TreeNode from '../../../../tree/tree-node'
import TransitionImportCatalog from './transition-import-catalog'

namespace TransitionsElement {
  export type Kind = 'transitions'
  export type Element = { kind: Kind; appIds: string[] }

  export const create = (): Element => ({ kind: 'transitions', appIds: [] })

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
  ): ElementEditSchema.Schema<Element> => {
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
    treeLabel: { type: 'static', kindText: 'Transitions', tone: 'folder' },
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
  } satisfies ElementDefinition.Definition<Element>
}

export default TransitionsElement
