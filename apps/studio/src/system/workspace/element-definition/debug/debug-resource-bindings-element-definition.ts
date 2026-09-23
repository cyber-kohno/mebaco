import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import type TreeNode from '@system/model/tree/tree-node'
import DebugResourceBindings from '@system/model/debug/debug-resource-bindings'

namespace DebugResourceBindingsElementDefinition {
  const parseBindings = (
    source: string,
    resources: readonly DebugResourceBindings.Resource[],
  ): DebugResourceBindings.Binding[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      const bindings = Array.isArray(parsed)
        ? parsed.flatMap((entry): DebugResourceBindings.Binding[] => (
            typeof entry === 'object'
            && entry != null
            && typeof (entry as { resourceId?: unknown }).resourceId === 'string'
            && typeof (entry as { path?: unknown }).path === 'string'
              ? [{
                  resourceId: (entry as { resourceId: string }).resourceId,
                  path: (entry as { path: string }).path,
                }]
              : []
          ))
        : []
      return DebugResourceBindings.normalizeBindings(bindings, resources)
    } catch {
      return DebugResourceBindings.normalizeBindings([], resources)
    }
  }

  const getKindLabel = (
    resourceKind: DebugResourceBindings.Resource['resourceKind'],
  ): string => {
    switch (resourceKind) {
      case 'directory-resource': return 'Directory'
      case 'text-resource': return 'Text file'
      case 'sqlite-resource': return 'SQLite'
    }
  }

  export const createSchema = (
    resources: readonly DebugResourceBindings.Resource[],
  ): ElementEditSchema.Schema<DebugResourceBindings.Element> => ({
    createTitle: 'Create Resource Bindings',
    updateTitle: 'Update Resource Bindings',
    fields: [{
      type: 'resourceBindings',
      key: 'bindings',
      label: 'Resources',
      defaultValue: '[]',
      resources: resources.map((resource) => ({
        resourceId: resource.resourceId,
        label: resource.id,
        kindLabel: getKindLabel(resource.resourceKind),
      })),
    }],
    getInitialValues: (element) => ({
      bindings: JSON.stringify(DebugResourceBindings.normalizeBindings(
        element.bindings,
        resources,
      )),
    }),
    create: (values) => DebugResourceBindings.create(parseBindings(values.bindings, resources)),
    update: (element, values) => ({
      ...element,
      bindings: parseBindings(values.bindings, resources),
    }),
  })

  export const definition = {
    kind: 'debug-resource-bindings',
    treeLabel: {
      type: 'static',
      kindText: 'Resource bindings',
      tone: 'manager',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const resources: DebugResourceBindings.Resource[] = []
      const collect = (node: TreeNode.Node) => {
        if (
          node.element.kind === 'directory-resource'
          || node.element.kind === 'text-resource'
          || node.element.kind === 'sqlite-resource'
        ) {
          resources.push({
            resourceId: node.element.resourceId,
            id: node.element.id,
            resourceKind: node.element.kind,
          })
        }
        node.children.forEach(collect)
      }
      collect(context.rootNode)
      return [action('Modify', () => ElementDialog.openUpdate(
        context.node.id,
        context.element,
        createSchema(resources),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<DebugResourceBindings.Element>
}

export default DebugResourceBindingsElementDefinition
