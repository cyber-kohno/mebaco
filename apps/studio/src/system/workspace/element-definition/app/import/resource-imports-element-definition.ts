import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import type TreeNode from '@system/model/tree/tree-node'
import ImportItemsTreeLabel from '@system/workspace/tree/label/app/import/ImportItemsTreeLabel.svelte'
import ResourceImportCatalog from '@system/model/app/import/resource-import-catalog'
import type ResourceImports from '@system/model/app/import/resource-imports'

namespace ResourceImportsElementDefinition {
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
  ): ElementEditSchema.Schema<ResourceImports.Element> => ({
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
    treeLabel: { type: 'component', Component: ImportItemsTreeLabel },
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
  } satisfies ElementDefinition.Definition<ResourceImports.Element>
}

export default ResourceImportsElementDefinition
