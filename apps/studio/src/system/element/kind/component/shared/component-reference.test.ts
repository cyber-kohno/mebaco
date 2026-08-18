import { describe, expect, it } from 'vitest'
import ComponentReference from './component-reference'
import type ValuePropElement from '../definition/value-prop-element'

const createProp = (
  id: string,
  defaultValue?: ValuePropElement.Element['defaultValue'],
): ValuePropElement.Element => ({
  kind: 'value-prop',
  propId: `${id}-stable-id`,
  id,
  valueType: { type: 'string' },
  nullable: false,
  defaultValue,
})

describe('ComponentReference', () => {
  it('requires a binding only when the Value Prop has no default', () => {
    const component: ComponentReference.Option = {
      componentId: 'Sample',
      label: 'Sample',
      props: [
        createProp('requiredValue'),
        createProp('defaultValue', { type: 'literal', value: 'initial' }),
      ],
    }

    expect(ComponentReference.validateBindings('[]', component))
      .toBe("Set a value for 'requiredValue'.")

    const bindings: ComponentReference.Binding[] = [{
      propId: 'requiredValue-stable-id',
      kind: 'value',
      source: { type: 'literal', value: 'set' },
    }]
    expect(ComponentReference.validateBindings(
      ComponentReference.stringifyBindings(bindings),
      component,
    )).toBeNull()
  })

  it('keeps bindings by stable Prop id and removes stale bindings', () => {
    const component: ComponentReference.Option = {
      componentId: 'Sample',
      label: 'Sample',
      props: [createProp('current')],
    }
    const bindings: ComponentReference.Binding[] = [
      {
        propId: 'stale-id',
        kind: 'value',
        source: { type: 'literal', value: 'old' },
      },
      {
        propId: 'current-stable-id',
        kind: 'value',
        source: { type: 'literal', value: 'current' },
      },
    ]

    expect(ComponentReference.normalizeBindings(bindings, component))
      .toEqual([bindings[1]])
  })
})
