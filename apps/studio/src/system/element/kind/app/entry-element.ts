import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import type TreeNode from '../../../tree/tree-node'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import EntryTreeLabel from './EntryTreeLabel.svelte'
import ComponentElement from '../component/definition/component-element'
import ComponentReference from '../component/shared/component-reference'
import type ValuePropElement from '../component/definition/value-prop-element'

namespace EntryElement {
  export type Kind = 'entry'

  export type Element = {
    kind: Kind
    componentId: string | null
    propBindings: ComponentReference.Binding[]
  }

  export const create = (): Element => ({
    kind: 'entry',
    componentId: null,
    propBindings: [],
  })

  export type CreateSchemaOptions = {
    components?: readonly ComponentReference.Option[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
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
    createPreview: create,
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
  } satisfies ElementDefinition.Definition<Element>
}

export default EntryElement
