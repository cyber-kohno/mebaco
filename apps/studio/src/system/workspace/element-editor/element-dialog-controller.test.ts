import { afterEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import ElementDialog from './element-dialog-controller'
import { elementDialogStore } from './element-dialog-store'
import type ElementEditSchema from './element-edit-schema'
import type MebacoElement from '@system/model/element/element'

const element: MebacoElement.Element = { kind: 'text', source: { type: 'literal', value: 'saved' } }
const schema: ElementEditSchema.Schema<MebacoElement.Element> = {
  createTitle: 'Create', updateTitle: 'Update', fields: [],
  getInitialValues: () => ({}), create: () => element, update: () => element,
}

describe('Element dialog session identity', () => {
  afterEach(() => ElementDialog.close())

  it('invalidates a pending update session on close and reopen, even for the same node', async () => {
    ElementDialog.openUpdate(1, element, schema)
    const previous = get(elementDialogStore)!
    expect(ElementDialog.isCurrent(previous)).toBe(true)
    let finishPreflight!: () => void
    const preflight = new Promise<void>((resolve) => { finishPreflight = resolve })
    const pending = preflight.then(() => ElementDialog.isCurrent(previous))
    ElementDialog.close()
    expect(ElementDialog.isCurrent(previous)).toBe(false)
    ElementDialog.openUpdate(1, element, schema)
    expect(ElementDialog.isCurrent(get(elementDialogStore)!)).toBe(true)
    finishPreflight()
    await expect(pending).resolves.toBe(false)
  })
})
