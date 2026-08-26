import type ElementDefinition from '../../../../element-definition'
import type ElementEditSchema from '../../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../../action-menu/action-menu-state'
import ContentActions from '../../../../content-actions'
import ElementDialog from '../../../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../../../store/tree-store'
import type TreeNode from '../../../../../tree/tree-node'
import type SlotElement from './slot-element'
import SlotUseTreeLabel from './SlotUseTreeLabel.svelte'
import ComponentReference from '../../shared/component-reference'
import type ValuePropElement from '../value-prop-element'

namespace SlotUseElement {
  export type Kind = 'slot-use'
  export type Element = { kind: Kind; slotId: string; propBindings: ComponentReference.Binding[] }

  export type Option = ComponentReference.Option & { value: string }

  export const create = (slotId = ''): Element => ({ kind: 'slot-use', slotId, propBindings: [] })

  export const createSchema = (slots: readonly Option[] = []): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Slot Content',
    updateTitle: 'Update Slot Content',
    fields: [{
      type: 'select',
      key: 'slotId',
      label: 'Slot',
      width: 'id',
      required: true,
      defaultValue: slots[0]?.value ?? '',
      clearWhenChanged: ['propBindings'],
      options: slots,
    }, {
      type: 'componentBindings',
      key: 'propBindings',
      label: 'Props',
      defaultValue: '[]',
      required: true,
      componentIdKey: 'slotId',
      components: slots,
    }],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({
      slotId: element.slotId,
      propBindings: ComponentReference.stringifyBindings(element.propBindings ?? []),
    }),
    create: (values) => ({
      kind: 'slot-use',
      slotId: values.slotId,
      propBindings: parseBindings(values, slots),
    }),
    update: (element, values) => ({
      ...element,
      slotId: values.slotId,
      propBindings: parseBindings(values, slots),
    }),
  })

  export const definition = {
    kind: 'slot-use',
    treeLabel: { type: 'component', Component: SlotUseTreeLabel },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        ContentActions.createAddMenu(context.node.id, context.rootNode),
        ContentActions.createAddDirectiveMenu(context.node.id, context.rootNode),
        ContentActions.createAddBlockItem(context.node.id),
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema(SlotUseElement.getOptions(context.rootNode, context.node.id)),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>

  const parseBindings = (
    values: Readonly<Record<string, string>>,
    slots: readonly Option[],
  ): ComponentReference.Binding[] => ComponentReference.normalizeBindings(
    ComponentReference.parseBindings(values.propBindings) ?? [],
    slots.find((slot) => slot.componentId === values.slotId),
  )

  export const getOptions = (rootNode: TreeNode.Node, nodeId: number): Option[] => {
    const path: TreeNode.Node[] = []
    const walk = (node: TreeNode.Node): boolean => {
      path.push(node)
      if (node.id === nodeId) return true
      for (const child of node.children) if (walk(child)) return true
      path.pop()
      return false
    }
    if (!walk(rootNode)) return []
    const component = [...path].reverse().find((node) => node.element.kind === 'component')
    const slots = component?.children.find((child) => child.element.kind === 'slots')
    return slots?.children
      .filter((node): node is TreeNode.Node & { element: SlotElement.Element } => node.element.kind === 'slot')
      .map((node) => ({
        componentId: node.element.slotId,
        value: node.element.slotId,
        label: node.element.id,
        props: node.children
          .find((child) => child.element.kind === 'props')?.children
          .map((child) => child.element)
          .filter((element): element is ValuePropElement.Element => element.kind === 'value-prop') ?? [],
      })) ?? []
  }
}

export default SlotUseElement
