import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ComponentReference from '@system/model/component/component-reference'
import ComponentUse from '@system/model/component/component-use'
import ComponentUseTreeLabel from '@system/workspace/tree/label/component/ComponentUseTreeLabel.svelte'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'

namespace ComponentUseElementDefinition {
  export type CreateSchemaOptions = {
    components?: readonly ComponentReference.Option[]
  }

  const parseBindings = (
    values: Readonly<Record<string, string>>,
    components: readonly ComponentReference.Option[] = [],
  ): ComponentReference.Binding[] => {
    const component = components.find(
      (candidate) => candidate.componentId === values.componentId,
    )
    return ComponentReference.normalizeBindings(
      ComponentReference.parseBindings(values.propBindings) ?? [],
      component,
    )
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<ComponentUse.Element> => ({
    createTitle: 'Create Component View',
    updateTitle: 'Update Component View',
    fields: [
      {
        type: 'select',
        key: 'componentId',
        label: 'Component',
        width: 'id',
        defaultValue: '',
        required: true,
        clearWhenChanged: ['propBindings'],
        options: (options.components ?? []).map((component) => ({
          value: component.componentId,
          label: component.label,
          detail: component.detail,
        })),
      },
      {
        type: 'componentBindings',
        key: 'propBindings',
        label: 'Props',
        defaultValue: '[]',
        required: true,
        componentIdKey: 'componentId',
        components: options.components ?? [],
      },
    ],
    createPreview: ComponentUse.create,
    getInitialValues: (element) => ({
      componentId: element.componentId ?? '',
      propBindings: ComponentReference.stringifyBindings(element.propBindings ?? []),
    }),
    create: (values) => ({
      kind: 'component-use',
      componentId: values.componentId.length === 0 ? null : values.componentId,
      propBindings: parseBindings(values, options.components),
    }),
    update: (element, values) => ({
      ...element,
      componentId: values.componentId.length === 0 ? null : values.componentId,
      propBindings: parseBindings(values, options.components),
    }),
  })

  export const definition = {
    kind: 'component-use',
    treeLabel: {
      type: 'component',
      Component: ComponentUseTreeLabel,
    },
    getHierarchyText: ({ element, node, rootNode }) => {
      if (element.componentId == null) return '<->'
      const componentNode = ComponentUse.findComponentNode(
        rootNode,
        node.id,
        element.componentId,
      )
      return componentNode?.element.kind === 'component'
        ? `<${componentNode.element.id}>`
        : '<->'
    },
    syncChildren: ComponentUse.syncSlots,
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        action('Refresh slots', () => {
          TreeStore.updateElement(context.node.id, context.element)
        }),
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({
              components: ComponentUse.getComponents(
                context.rootNode,
                context.node.id,
              ),
            }),
          )
        }),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<ComponentUse.Element>
}

export default ComponentUseElementDefinition
