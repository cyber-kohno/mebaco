import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import type TreeNode from '../../../../tree/tree-node'
import ResourceImportCatalog from './resource-import-catalog'

namespace ResourceImportsElement {
  export type Kind = 'resource-imports'
  export type Element = { kind: Kind; resourceIds: string[] }

  export const create = (): Element => ({ kind: 'resource-imports', resourceIds: [] })

  const parseResourceIds = (value: string): string[] => {
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
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Resource Imports',
    updateTitle: 'Update Resource Imports',
    fields: [{
      type: 'resourceImports',
      key: 'resourceIds',
      label: 'Resources',
      defaultValue: '[]',
      options: ResourceImportCatalog.getAvailableResources(rootNode).map((resource) => ({
        value: resource.element.resourceId,
        label: resource.element.id,
      })),
    }],
    getInitialValues: (element) => ({ resourceIds: JSON.stringify(element.resourceIds) }),
    create: (values) => ({ kind: 'resource-imports', resourceIds: parseResourceIds(values.resourceIds) }),
    update: (element, values) => ({ ...element, resourceIds: parseResourceIds(values.resourceIds) }),
  })

  export const definition = {
    kind: 'resource-imports',
    treeLabel: { type: 'static', kindText: 'Resources', tone: 'manager' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [action('Modify', () => ElementDialog.openUpdate(
        context.node.id,
        context.element,
        createSchema(context.rootNode),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ResourceImportsElement
