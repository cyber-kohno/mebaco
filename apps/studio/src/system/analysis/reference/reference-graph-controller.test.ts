import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import ReferenceGraphController from './reference-graph-controller'

describe('ReferenceGraphController', () => {
  beforeEach(() => {
    ReferenceGraphController.close()
  })

  it('keeps visibility independent from the selected tree node', () => {
    ReferenceGraphController.open()
    expect(get(ReferenceGraphController.visible)).toBe(true)

    ReferenceGraphController.toggle()
    expect(get(ReferenceGraphController.visible)).toBe(false)

    ReferenceGraphController.toggle()
    expect(get(ReferenceGraphController.visible)).toBe(true)
  })
})
