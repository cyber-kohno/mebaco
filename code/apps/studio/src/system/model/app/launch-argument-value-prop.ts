import type ComponentReference from '@system/model/component/component-reference'
import ValueSource from '@system/model/value/value-source'
import type LaunchArgument from './launch-argument'

namespace LaunchArgumentValueProp {
  export type Prop = Omit<ComponentReference.Prop, 'defaultValue'> & {
    kind: 'value-prop'
    defaultValue?: ValueSource.Value
  }

  export const convert = (
    argument: LaunchArgument.Element,
  ): Prop => ({
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
