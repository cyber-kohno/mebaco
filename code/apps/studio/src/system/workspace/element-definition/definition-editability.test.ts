import { describe, expect, it, vi } from 'vitest'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import type TreeNode from '@system/model/tree/tree-node'
import AppElementDefinition from '@system/workspace/element-definition/app/app-element-definition'
import LaunchArgumentElementDefinition from '@system/workspace/element-definition/app/launch-argument-element-definition'
import ComponentElement from '@system/workspace/element-definition/component/component-element-definition'
import SlotElement from '@system/workspace/element-definition/component/slot-element-definition'
import ValuePropElement from '@system/workspace/element-definition/component/value-prop-element-definition'
import SwitchElement from '@system/workspace/element-definition/directive/switch-element-definition'
import FunctionElement from '@system/workspace/element-definition/function/function-element-definition'
import LauncherElementDefinition from '@system/workspace/element-definition/project/launcher-element-definition'
import ObjectTypeElementDefinition from '@system/workspace/element-definition/type-system/object/object-type-element-definition'
import SignatureTypeElementDefinition from '@system/workspace/element-definition/type-system/signature/signature-type-element-definition'
import UnionTypeElementDefinition from '@system/workspace/element-definition/type-system/union/union-type-element-definition'
import StateElementDefinition from '@system/workspace/element-definition/variable/store/state-element-definition'
import VariableElementDefinition from '@system/workspace/element-definition/variable/variable-element-definition'
import StyleElement from '@system/workspace/element-definition/view/style/style-element-definition'
import StyleParamElement from '@system/workspace/element-definition/view/style/style-param-element-definition'
import PromiseElementDefinition from '@system/workspace/element-definition/promise/promise-element-definition'

vi.mock('@system/workspace/tree/state', () => ({
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
    ['App', AppElementDefinition.createSchema()],
    ['Launch Argument', LaunchArgumentElementDefinition.createSchema()],
    ['Component', ComponentElement.createSchema()],
    ['Slot', SlotElement.createSchema()],
    ['Value Prop', ValuePropElement.createSchema()],
    ['Function', FunctionElement.createSchema()],
    ['Launcher', LauncherElementDefinition.createSchema(emptyRoot)],
    ['Object Type', ObjectTypeElementDefinition.createSchema()],
    ['Signature Type', SignatureTypeElementDefinition.createSchema()],
    ['Union Type', UnionTypeElementDefinition.createSchema()],
    ['State', StateElementDefinition.createSchema()],
    ['Variable', VariableElementDefinition.createSchema()],
    ['Promise Result', PromiseElementDefinition.createSchema()],
    ['Style', StyleElement.createSchema()],
    ['Style Parameter', StyleParamElement.createSchema()],
  ]

  it.each(idSchemas)('allows updating the %s Id through Modify', (_name, schema) => {
    expectEditable(schema, 'id')
  })

  const valueTypeSchemas: Array<[string, { fields: readonly ElementEditSchema.Field[] }, string]> = [
    ['Launch Argument', LaunchArgumentElementDefinition.createSchema(), 'valueType'],
    ['Value Prop', ValuePropElement.createSchema(), 'valueType'],
    ['Function Signature', FunctionElement.createSchema(), 'signatureDefinition'],
    ['State', StateElementDefinition.createSchema(), 'valueType'],
    ['Variable', VariableElementDefinition.createSchema(), 'valueType'],
    ['Promise Result', PromiseElementDefinition.createSchema(), 'valueType'],
    ['Style Parameter', StyleParamElement.createSchema(), 'valueType'],
    ['Switch', SwitchElement.createSchema(), 'valueType'],
  ]

  it.each(valueTypeSchemas)('allows updating the %s Value Type', (_name, schema, key) => {
    const field = schema.fields.find((candidate) => candidate.key === key)
    expect(field?.readOnlyOnUpdate).not.toBe(true)
  })

  it('resets the Style Parameter default settings when its Value Type changes', () => {
    expect(StyleParamElement.createSchema().fields.find(
      (field) => field.key === 'valueType',
    )).toMatchObject({
      clearWhenChanged: ['hasDefaultValue', 'defaultValue'],
    })
  })
})
