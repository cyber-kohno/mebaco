import type ValuePropElement from '../../component/definition/value-prop-element'
import ValueSource from '../../../../ui/input/value-source'
import type LaunchArgumentElement from './launch-argument-element'

namespace LaunchArgumentValueProp {
  export const convert = (
    argument: LaunchArgumentElement.Element,
  ): ValuePropElement.Element => ({
    kind: 'value-prop',
    propId: argument.propId,
    id: argument.id,
    valueType: argument.valueType,
    nullable: argument.nullable,
    defaultValue: argument.defaultValue
      ?? (argument.nullable ? ValueSource.createDefault() : undefined),
  })
}

export default LaunchArgumentValueProp
