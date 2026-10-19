import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import type TreeNode from '@system/model/tree/tree-node'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import EntryTreeLabel from '@system/workspace/tree/label/app/EntryTreeLabel.svelte'
import ComponentElement from '@system/model/component/component'
import ComponentReference from '@system/model/component/component-reference'
import type ValuePropElement from '@system/model/component/value-prop'
import Entry from '@system/model/app/entry'

namespace EntryElementDefinition {
  export type CreateSchemaOptions = {
    components?: readonly ComponentReference.Option[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Entry.Element> => ({
    createTitle: 'Create Entry',
    updateTitle: 'Update Entry',
    fields: [
      {
        type: 'select',
        key: 'componentId',
        label: 'Component',
        width: 'id',
        defaultValue: '',
        clearWhenChanged: ['propBindings'],
        options: (options.components ?? []).map((component) => ({
          value: component.componentId,
          label: component.label,
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
    createPreview: Entry.create,
    getInitialValues: (element) => ({
      componentId: element.componentId ?? '',
      propBindings: ComponentReference.stringifyBindings(element.propBindings ?? []),
    }),
    create: (values) => ({
      kind: 'entry',
      componentId: values.componentId.length === 0 ? null : values.componentId,
      propBindings: parseBindings(values, options.components),
    }),
    update: (element, values) => ({
      ...element,
      componentId: values.componentId.length === 0 ? null : values.componentId,
      propBindings: parseBindings(values, options.components),
    }),
  })

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

  const findOwnerAppNode = (
    node: TreeNode.Node,
    targetNodeId: number,
    ownerAppNode: TreeNode.Node | null = null,
  ): TreeNode.Node | null => {
    const currentOwnerAppNode = node.element.kind === 'app' ? node : ownerAppNode
    if (node.id === targetNodeId) return currentOwnerAppNode

    for (const child of node.children) {
      const found = findOwnerAppNode(child, targetNodeId, currentOwnerAppNode)
      if (found != null) return found
    }

    return null
  }

  export const getComponents = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ComponentReference.Option[] => {
    const ownerAppNode = findOwnerAppNode(rootNode, targetNodeId)
    if (ownerAppNode == null) return []

    const components: ComponentReference.Option[] = []
    const collect = (node: TreeNode.Node) => {
      if (node.element.kind === 'component' && !ComponentElement.isLocal(node.element)) {
        const props = node.children
          .find((child) => child.element.kind === 'props')
          ?.children
          .map((child) => child.element)
          .filter((element): element is ValuePropElement.Element => element.kind === 'value-prop')
          ?? []
        components.push({
          componentId: node.element.componentId,
          label: node.element.id,
          props,
        })
      }
      node.children.forEach(collect)
    }
    collect(ownerAppNode)
    return components
  }

  export const definition = {
    kind: 'entry',
    treeLabel: {
      type: 'component',
      Component: EntryTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({
              components: getComponents(context.rootNode, context.node.id),
            }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Entry.Element>
}

export default EntryElementDefinition
