import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ControlSwitch from '@system/model/directive/control-switch'
import Switch from '@system/model/directive/switch'
import SwitchValueType from '@system/model/directive/switch-value-type'
import SwitchElementDefinition from './switch-element-definition'

namespace ControlSwitchElementDefinition {
  export const createSchema = (
    options: SwitchElementDefinition.CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<ControlSwitch.Element> => {
    const schema = SwitchElementDefinition.createSchema(options)
    return {
      ...schema,
      createPreview: () => ControlSwitch.create(SwitchValueType.createPrimitive(), '...'),
      getInitialValues: (element) => schema.getInitialValues(element as unknown as Switch.Element),
      create: (values) => ({
        ...schema.create(values),
        kind: 'control-switch',
      } as ControlSwitch.Element),
      update: (element, values) => ({
        ...schema.update(element as unknown as Switch.Element, values),
        kind: 'control-switch',
      } as ControlSwitch.Element),
    } as ElementEditSchema.Schema<ControlSwitch.Element>
  }

  export const definition = {
    kind: 'control-switch',
    treeLabel: {
      type: 'static',
      kindText: 'Switch',
      tone: 'block',
      getValueText: (element: ControlSwitch.Element) => (
        `${SwitchValueType.getLabel(Switch.normalizeValueType(element.valueType))}: ${element.source}`
      ),
    },
    getContextMenu: (context) => SwitchElementDefinition.definition.getContextMenu(
      context as unknown as Parameters<typeof SwitchElementDefinition.definition.getContextMenu>[0],
    ),
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<ControlSwitch.Element>
}

export default ControlSwitchElementDefinition
