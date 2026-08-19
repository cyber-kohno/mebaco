import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import SwitchElement from './switch-element'
import SwitchValueType from './switch-value-type'

namespace ControlSwitchElement {
  export type Kind = 'control-switch'
  export type Element = { kind: Kind; valueType: SwitchElement.ValueType; source: string }
  export const create = (valueType: Element['valueType'], source: string): Element => ({ kind: 'control-switch', valueType, source })

  export const createSchema = (options: SwitchElement.CreateSchemaOptions = {}): ElementEditSchema.Schema<Element> => {
    const schema = SwitchElement.createSchema(options)
    return {
      ...schema,
      createPreview: () => create(SwitchValueType.createPrimitive(), '...'),
      getInitialValues: (element) => schema.getInitialValues(element as unknown as SwitchElement.Element),
      create: (values) => ({ ...schema.create(values), kind: 'control-switch' } as Element),
      update: (element, values) => ({ ...schema.update(element as unknown as SwitchElement.Element, values), kind: 'control-switch' } as Element),
    } as ElementEditSchema.Schema<Element>
  }

  export const definition = {
    kind: 'control-switch',
    treeLabel: { type: 'static', kindText: 'Switch', tone: 'block', getValueText: (element: Element) => `${SwitchValueType.getLabel(SwitchElement.normalizeValueType(element.valueType))}: ${element.source}` },
    getContextMenu: (context) => SwitchElement.definition.getContextMenu(
      context as unknown as Parameters<typeof SwitchElement.definition.getContextMenu>[0],
    ),
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ControlSwitchElement
