import { describe, expect, it, vi } from 'vitest'
import type ElementEditSchema from '../../element-dialog/element-edit-schema'
import type TreeNode from '../../tree/tree-node'
import AppElement from './app/app-element'
import LaunchArgumentElement from './app/launch-argument-element'
import ComponentElement from './component/definition/component-element'
import SlotElement from './component/definition/slot/slot-element'
import ValuePropElement from './component/definition/value-prop-element'
import SwitchElement from './directive/switch-element'
import FunctionArgumentElement from './function/function-argument-element'
import FunctionElement from './function/function-element'
import LauncherElement from './project/launcher-element'
import ObjectTypeElement from './type/object-type-element'
import SignatureTypeElement from './type/signature-type-element'
import UnionTypeElement from './type/union-type-element'
import StateElement from './variable/store/state-element'
import VariableElement from './variable/variable-element'
import StyleElement from './view/style-element'
import StyleParamElement from './view/style-param-element'

vi.mock('../../store/tree-store', () => ({
  default: {
    removeNode: vi.fn(),
  },
}))

const emptyRoot: TreeNode.Node = {
  id: 1,
  element: { kind: 'project' },
  isOpen: true,
  children: [],
}

const expectEditable = (
  schema: { fields: readonly ElementEditSchema.Field[] },
  key: string,
) => {
  const field = schema.fields.find((candidate) => candidate.key === key)
  expect(field, `${key} field was not found`).toBeDefined()
  expect(field?.readOnlyOnUpdate).not.toBe(true)
}

describe('definition update editability', () => {
  const idSchemas: Array<[string, { fields: readonly ElementEditSchema.Field[] }]> = [
    ['App', AppElement.createSchema()],
    ['Launch Argument', LaunchArgumentElement.createSchema()],
    ['Component', ComponentElement.createSchema()],
    ['Slot', SlotElement.createSchema()],
    ['Value Prop', ValuePropElement.createSchema()],
    ['Function', FunctionElement.createSchema()],
    ['Function Argument', FunctionArgumentElement.createSchema()],
    ['Launcher', LauncherElement.createSchema(emptyRoot)],
    ['Object Type', ObjectTypeElement.createSchema()],
    ['Signature Type', SignatureTypeElement.createSchema()],
    ['Union Type', UnionTypeElement.createSchema()],
    ['State', StateElement.createSchema()],
    ['Variable', VariableElement.createSchema()],
    ['Style', StyleElement.createSchema()],
    ['Style Parameter', StyleParamElement.createSchema()],
  ]

  it.each(idSchemas)('allows updating the %s Id', (_name, schema) => {
    expectEditable(schema, 'id')
  })

  const valueTypeSchemas: Array<[string, { fields: readonly ElementEditSchema.Field[] }, string]> = [
    ['Launch Argument', LaunchArgumentElement.createSchema(), 'valueType'],
    ['Value Prop', ValuePropElement.createSchema(), 'valueType'],
    ['Function return', FunctionElement.createSchema(), 'returnType'],
    ['Function Argument', FunctionArgumentElement.createSchema(), 'valueType'],
    ['State', StateElement.createSchema(), 'valueType'],
    ['Variable', VariableElement.createSchema(), 'valueType'],
    ['Style Parameter', StyleParamElement.createSchema(), 'valueType'],
    ['Switch', SwitchElement.createSchema(), 'valueType'],
  ]

  it.each(valueTypeSchemas)('allows updating the %s Value Type', (_name, schema, key) => {
    expectEditable(schema, key)
  })

  it('resets the Style Parameter default settings when its Value Type changes', () => {
    expect(StyleParamElement.createSchema().fields.find(
      (field) => field.key === 'valueType',
    )).toMatchObject({
      clearWhenChanged: ['hasDefaultValue', 'defaultValue'],
    })
  })
})
