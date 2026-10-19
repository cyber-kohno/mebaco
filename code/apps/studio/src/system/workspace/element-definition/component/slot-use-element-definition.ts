import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import SlotUseTreeLabel from '@system/workspace/tree/label/component/SlotUseTreeLabel.svelte'
import ComponentReference from '@system/model/component/component-reference'
import SlotUse from '@system/model/component/slot-use'

namespace SlotUseElementDefinition {
  export const createSchema = (
    slots: readonly SlotUse.Option[] = [],
  ): ElementEditSchema.Schema<SlotUse.Element> => ({
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
    createPreview: () => SlotUse.create('...'),
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
          createSchema(SlotUse.getOptions(context.rootNode, context.node.id)),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<SlotUse.Element>

  const parseBindings = (
    values: Readonly<Record<string, string>>,
    slots: readonly SlotUse.Option[],
  ): ComponentReference.Binding[] => ComponentReference.normalizeBindings(
    ComponentReference.parseBindings(values.propBindings) ?? [],
    slots.find((slot) => slot.componentId === values.slotId),
  )

}

export default SlotUseElementDefinition
