import type Switch from '@system/model/directive/switch'

namespace ControlSwitch {
  export type Kind = 'control-switch'
  export type Element = {
    kind: Kind
    valueType: Switch.ValueType
    source: string
  }

  export const create = (
    valueType: Element['valueType'],
    source: string,
  ): Element => ({
    kind: 'control-switch',
    valueType,
    source,
  })
}

export default ControlSwitch
