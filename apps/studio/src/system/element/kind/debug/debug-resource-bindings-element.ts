import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import type TreeNode from '../../../tree/tree-node'

namespace DebugResourceBindingsElement {
  export type Kind = 'debug-resource-bindings'

  export type Binding = {
    resourceId: string
    path: string
  }

  export type Resource = {
    resourceId: string
    id: string
    resourceKind: 'directory-resource' | 'text-resource' | 'sqlite-resource'
  }

  export type Element = {
    kind: Kind
    bindings: Binding[]
  }

  export const create = (
    bindings: Binding[] = [],
  ): Element => ({
    kind: 'debug-resource-bindings',
    bindings,
  })

  export const normalizeBindings = (
    bindings: readonly Binding[],
    resources: readonly Resource[],
  ): Binding[] => {
    const pathByResourceId = new Map<string, string>()
    bindings.forEach((binding) => {
      if (!pathByResourceId.has(binding.resourceId)) {
        pathByResourceId.set(binding.resourceId, binding.path)
      }
    })
    return resources.map((resource) => ({
      resourceId: resource.resourceId,
      path: pathByResourceId.get(resource.resourceId) ?? '',
    }))
  }

  const parseBindings = (
    source: string,
    resources: readonly Resource[],
  ): Binding[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      const bindings = Array.isArray(parsed)
        ? parsed.flatMap((entry): Binding[] => (
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
      return normalizeBindings(bindings, resources)
    } catch {
      return normalizeBindings([], resources)
    }
  }

  const getKindLabel = (
    resourceKind: Resource['resourceKind'],
  ): string => {
    switch (resourceKind) {
      case 'directory-resource': return 'Directory'
      case 'text-resource': return 'Text file'
      case 'sqlite-resource': return 'SQLite'
    }
  }

  export const createSchema = (
    resources: readonly Resource[],
  ): ElementEditSchema.Schema<Element> => ({
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
      bindings: JSON.stringify(normalizeBindings(element.bindings, resources)),
    }),
    create: (values) => create(parseBindings(values.bindings, resources)),
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
      const resources: Resource[] = []
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
  } satisfies ElementDefinition.Definition<Element>
}

export default DebugResourceBindingsElement
