import { describe, expect, it } from 'vitest'
import SwitchValueType from '../../directive/switch-value-type'
import LiteralUnion from './literal-union'
import TypeExpression from '../type-expression'
import UnionDefinition from './union-definition'

describe('LiteralUnion', () => {
  const overLimitText = 'a'.repeat(LiteralUnion.maxTextLength + 1)

  it('validates standalone literal unions', () => {
    expect(UnionDefinition.validate({
      type: 'literal',
      valueType: 'string',
      values: [overLimitText],
    }, [])).toBe('Literal must be 24 characters or fewer.')
  })

  it('validates value type literal unions', () => {
    expect(TypeExpression.validateProperties([{
      propertyId: 'status-property',
      id: 'status',
      valueType: {
        type: 'string',
        literals: [overLimitText],
      },
      optional: false,
      nullable: false,
    }])).toBe('String literal must be 24 characters or fewer.')
  })

  it('validates switch literal restrictions', () => {
    expect(SwitchValueType.validate({
      type: 'primitive',
      primitive: 'string',
      literals: [overLimitText],
    }, [])).toBe('Literal must be 24 characters or fewer.')
  })
})
