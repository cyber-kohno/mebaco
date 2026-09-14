import { describe, expect, it } from 'vitest'
import ElementDialogDirty from './element-dialog-dirty'
import type ElementDialogStore from './element-dialog-store'
import type ElementEditSchema from './element-edit-schema'
import type MebacoElement from '../element/element'

const schema: ElementEditSchema.Schema<MebacoElement.Element> = {
  createTitle: 'Create Test',
  updateTitle: 'Update Test',
  fields: [{ type: 'text', key: 'name', label: 'Name', defaultValue: 'default' }],
  getInitialValues: (element) => ({ name: element.kind === 'app' ? element.id : '' }),
  create: (values) => ({ kind: 'app', appId: 'app-id', id: values.name }),
  update: (element, values) => element.kind === 'app'
    ? { ...element, id: values.name }
    : element,
}

describe('ElementDialogDirty', () => {
  it('compares a Create session with its schema defaults', () => {
    const session: ElementDialogStore.CreateSession = {
      mode: 'create',
      parentNodeId: 1,
      schema,
    }
    const initial = ElementDialogDirty.getInitialValues(session)

    expect(ElementDialogDirty.isDirty(session, initial)).toBe(false)
    expect(ElementDialogDirty.isDirty(session, {
      ...initial,
      name: 'changed',
    })).toBe(true)
  })

  it('compares an Update session with the element initial values', () => {
    const element = { kind: 'app' as const, appId: 'app-id', id: 'before' }
    const session: ElementDialogStore.UpdateSession = {
      mode: 'update',
      nodeId: 2,
      element,
      schema,
    }
    const initial = ElementDialogDirty.getInitialValues(session)

    expect(ElementDialogDirty.isDirty(session, initial)).toBe(false)
    expect(ElementDialogDirty.isDirty(session, {
      ...initial,
      name: 'after',
    })).toBe(true)
  })
})
